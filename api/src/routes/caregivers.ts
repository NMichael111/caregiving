import { Router } from "express";
import { randomBytes } from "node:crypto";
import { prisma } from "../lib/db.js";
import { auth } from "../lib/auth.js";
import { requireRole } from "../lib/middleware.js";
import { createCaregiverSchema, updateCaregiverSchema } from "../schemas.js";

export const caregiversRouter = Router();
caregiversRouter.use(requireRole("ADMIN"));

function generateTempPassword(): string {
  return randomBytes(9).toString("base64").replace(/[+/=]/g, "x");
}

caregiversRouter.get("/", async (_req, res) => {
  const caregivers = await prisma.user.findMany({
    where: { role: "CAREGIVER" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, createdAt: true },
  });
  // Aggregate weekly hours (last 7 days) per caregiver
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const shifts = await prisma.shift.findMany({
    where: {
      caregiverId: { in: caregivers.map((c) => c.id) },
      status: "COMPLETED",
      clockInAt: { gte: weekStart, not: null },
      clockOutAt: { not: null },
    },
    select: { caregiverId: true, clockInAt: true, clockOutAt: true },
  });
  const hoursMap = new Map<string, number>();
  for (const s of shifts) {
    if (!s.clockInAt || !s.clockOutAt) continue;
    const hrs = (s.clockOutAt.getTime() - s.clockInAt.getTime()) / 3_600_000;
    hoursMap.set(s.caregiverId, (hoursMap.get(s.caregiverId) ?? 0) + hrs);
  }
  res.json(
    caregivers.map((c) => ({
      ...c,
      weeklyHours: Math.round((hoursMap.get(c.id) ?? 0) * 10) / 10,
    })),
  );
});

caregiversRouter.get("/:id", async (req, res) => {
  const caregiver = await prisma.user.findFirst({
    where: { id: req.params.id, role: "CAREGIVER" },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      shifts: {
        orderBy: { scheduledStart: "desc" },
        take: 50,
        include: { client: { select: { id: true, name: true } } },
      },
    },
  });
  if (!caregiver) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(caregiver);
});

caregiversRouter.post("/", async (req, res) => {
  const parsed = createCaregiverSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", issues: parsed.error.issues });
    return;
  }
  const { name, email } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "email_taken" });
    return;
  }
  const tempPassword = generateTempPassword();
  await auth.api.signUpEmail({ body: { name, email, password: tempPassword } });
  const user = await prisma.user.update({
    where: { email },
    data: { role: "CAREGIVER" },
    select: { id: true, name: true, email: true, createdAt: true },
  });
  // Auto-create a DM thread between this caregiver and every existing admin
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  for (const admin of admins) {
    await prisma.messageThread.create({
      data: {
        members: {
          create: [{ userId: admin.id }, { userId: user.id }],
        },
      },
    });
  }
  res.status(201).json({ ...user, tempPassword });
});

caregiversRouter.patch("/:id", async (req, res) => {
  const parsed = updateCaregiverSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", issues: parsed.error.issues });
    return;
  }
  const existing = await prisma.user.findFirst({
    where: { id: req.params.id, role: "CAREGIVER" },
  });
  if (!existing) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const updated = await prisma.user.update({
    where: { id: existing.id },
    data: {
      name: parsed.data.name ?? existing.name,
      email: parsed.data.email ?? existing.email,
    },
    select: { id: true, name: true, email: true, createdAt: true },
  });
  res.json(updated);
});
