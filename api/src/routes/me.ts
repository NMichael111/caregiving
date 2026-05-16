import { Router } from "express";
import { requireAuth } from "../lib/middleware.js";

export const meRouter = Router();

meRouter.get("/", requireAuth, (req, res) => {
  const user = req.session!.user as {
    id: string;
    email: string;
    name: string;
    role?: string;
  };
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role ?? "CAREGIVER",
  });
});
