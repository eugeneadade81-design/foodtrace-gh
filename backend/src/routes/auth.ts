import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { pool } from "../config/db";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";
import { createRateLimit } from "../middleware/rateLimit";
import { signAuthToken } from "../lib/jwt";
import {
  USER_ROLES,
  type AuthResponse,
  type LoginRequest,
  type RegisterRequest,
  type RequestOtpRequest,
  type RequestOtpResponse,
  type SessionUser,
  type UserRole,
  type VerifyOtpRequest,
  type VerifyOtpResponse,
} from "@foodtrace/shared";

const router = Router();
const loginRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: "Too many login attempts. Please try again later.",
});

const registerSchema = z.object({
  fullName: z.string().trim().min(2),
  phone: z.string().trim().min(7).max(20).optional().nullable(),
  email: z.string().trim().email().optional().nullable(),
  password: z.string().min(8),
  role: z.enum(USER_ROLES as [UserRole, ...UserRole[]]),
  language: z.string().trim().min(2).max(8).optional(),
});

const loginSchema = z.object({
  identifier: z.string().trim().min(3),
  password: z.string().min(1),
});

const requestOtpSchema = z.object({
  identifier: z.string().trim().min(3),
  purpose: z.enum(["login", "verify"]).optional(),
});

const verifyOtpSchema = z.object({
  identifier: z.string().trim().min(3),
  token: z.string().trim().min(4),
  purpose: z.enum(["login", "verify"]).optional(),
});

function mapUser(row: Record<string, unknown>): SessionUser {
  return {
    id: String(row.id),
    fullName: String(row.full_name),
    phone: row.phone ? String(row.phone) : null,
    email: row.email ? String(row.email) : null,
    role: row.role as UserRole,
    language: String(row.language ?? "en"),
    isVerified: Boolean(row.is_verified),
    isActive: Boolean(row.is_active),
  };
}

function normalizeIdentifier(value: string) {
  return value.trim().toLowerCase();
}

function generateOtpToken() {
  return String(crypto.randomInt(100000, 999999));
}

async function findUserByIdentifier(identifier: string) {
  const normalized = normalizeIdentifier(identifier);
  const result = await pool.query(
    `
    SELECT id, full_name, phone, email, role, language, is_verified, is_active
    FROM users
    WHERE LOWER(email) = $1 OR regexp_replace(coalesce(phone, ''), '\\D', '', 'g') = regexp_replace($1, '\\D', '', 'g')
    LIMIT 1
    `,
    [normalized]
  );

  if (!result.rowCount) {
    return null;
  }

  return result.rows[0];
}

router.get("/roles", (_req, res) => {
  res.json({ roles: USER_ROLES });
});

router.post("/request-otp", async (req, res) => {
  const parsed = requestOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const body = parsed.data satisfies RequestOtpRequest;
  const userRow = await findUserByIdentifier(body.identifier);
  if (!userRow) {
    return res.status(404).json({ error: "User not found" });
  }

  const token = generateOtpToken();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await pool.query(
    `
    INSERT INTO otp_tokens (user_id, token, purpose, expires_at)
    VALUES ($1, $2, $3, $4)
    `,
    [userRow.id, token, body.purpose ?? "login", expiresAt]
  );

  const response: RequestOtpResponse = {
    sent: true,
    otp: token,
    expiresAt,
  };
  return res.status(201).json(response);
});

router.post("/verify-otp", async (req, res) => {
  const parsed = verifyOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const body = parsed.data satisfies VerifyOtpRequest;
  const userRow = await findUserByIdentifier(body.identifier);
  if (!userRow) {
    return res.status(404).json({ error: "User not found" });
  }

  const result = await pool.query(
    `
    SELECT id, token, expires_at, used_at
    FROM otp_tokens
    WHERE user_id = $1 AND token = $2 AND purpose = $3
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [userRow.id, body.token, body.purpose ?? "login"]
  );

  if (!result.rowCount) {
    return res.status(401).json({ error: "Invalid OTP" });
  }

  const otpRow = result.rows[0];
  if (otpRow.used_at) {
    return res.status(401).json({ error: "OTP already used" });
  }

  if (new Date(otpRow.expires_at) < new Date()) {
    return res.status(401).json({ error: "OTP expired" });
  }

  await pool.query(`UPDATE otp_tokens SET used_at = now() WHERE id = $1`, [otpRow.id]);
  const user = mapUser(userRow);
  const token = signAuthToken({ sub: user.id, role: user.role, fullName: user.fullName });
  const response: VerifyOtpResponse = { token, user };
  return res.json(response);
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const body = parsed.data satisfies RegisterRequest;
  const existing = await pool.query(
    `SELECT id FROM users WHERE ($1::text IS NOT NULL AND phone = $1) OR ($2::text IS NOT NULL AND email = $2) LIMIT 1`,
    [body.phone ?? null, body.email ?? null]
  );
  if (existing.rowCount) {
    return res.status(409).json({ error: "User already exists" });
  }

  const passwordHash = await bcrypt.hash(body.password, 12);
  const result = await pool.query(
    `INSERT INTO users (full_name, phone, email, password_hash, role, language, is_verified, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, false, true)
     RETURNING id, full_name, phone, email, role, language, is_verified, is_active`,
    [body.fullName, body.phone ?? null, body.email ?? null, passwordHash, body.role, body.language ?? "en"]
  );

  const user = mapUser(result.rows[0]);
  const token = signAuthToken({ sub: user.id, role: user.role, fullName: user.fullName });
  const response: AuthResponse = { token, user };
  return res.status(201).json(response);
});

router.post("/login", loginRateLimit, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const body = parsed.data satisfies LoginRequest;
  const result = await pool.query(
    `SELECT id, full_name, phone, email, password_hash, role, language, is_verified, is_active
     FROM users
     WHERE email = $1 OR phone = $1
     LIMIT 1`,
    [body.identifier]
  );

  if (!result.rowCount) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const row = result.rows[0];
  const ok = await bcrypt.compare(body.password, String(row.password_hash));
  if (!ok) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const user = mapUser(row);
  const token = signAuthToken({ sub: user.id, role: user.role, fullName: user.fullName });
  const response: AuthResponse = { token, user };
  return res.json(response);
});

router.get("/me", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.auth?.userId;
  const result = await pool.query(
    `SELECT id, full_name, phone, email, role, language, is_verified, is_active
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId]
  );

  if (!result.rowCount) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.json({ user: mapUser(result.rows[0]) });
});

export default router;
