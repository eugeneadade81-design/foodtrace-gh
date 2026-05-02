import jwt from "jsonwebtoken";
import type { AuthUserClaims } from "@foodtrace/shared";

const jwtSecret = process.env.JWT_SECRET ?? "foodtrace-gh-dev-secret";

export function signAuthToken(payload: AuthUserClaims): string {
  return jwt.sign(payload, jwtSecret, { expiresIn: "7d" });
}

export function verifyAuthToken(token: string): AuthUserClaims {
  const decoded = jwt.verify(token, jwtSecret);
  if (typeof decoded === "string") {
    throw new Error("Invalid auth token");
  }
  return decoded as AuthUserClaims;
}
