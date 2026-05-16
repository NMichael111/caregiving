import type { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth, type Session } from "./auth.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      session?: Session;
    }
  }
}

async function loadSession(req: Request): Promise<Session | null> {
  if (req.session) return req.session;
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (session) req.session = session;
  return session;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = await loadSession(req);
  if (!session) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
}

export function requireRole(role: "ADMIN" | "CAREGIVER") {
  return async function (req: Request, res: Response, next: NextFunction) {
    const session = await loadSession(req);
    if (!session) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    // role is an additional field on User
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== role) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    next();
  };
}
