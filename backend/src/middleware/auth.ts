import type { NextFunction, Request, Response } from "express";
import { verifyAuthToken } from "../lib/jwt";
import type { UserRole } from "@foodtrace/shared";

export interface AuthenticatedRequest extends Request {
  auth?: {
    userId: string;
    role: UserRole;
    fullName: string;
  };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  const token = header.slice("Bearer ".length);
  try {
    const claims = verifyAuthToken(token);
    req.auth = {
      userId: claims.sub,
      role: claims.role,
      fullName: claims.fullName,
    };
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const role = req.auth?.role;
    if (!role || !roles.includes(role)) {
      return res.status(403).json({ error: "Insufficient role" });
    }
    return next();
  };
}
