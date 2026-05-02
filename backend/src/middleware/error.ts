import type { NextFunction, Request, Response } from "express";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // Keep production responses generic while still logging on the server.
  console.error(err);
  if (res.headersSent) {
    return;
  }
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
}

