import { Router } from "express";
import { prisma } from "../lib/db.js";
import { requireAuth, requireRole } from "../lib/middleware.js";
import { isOutsideGeofence } from "../lib/geofence.js";
import {
  clockInSchema,
  clockOutSchema,
  completeShiftSchema,
  createShiftSchema,
  updateShiftSchema,
} from "../schemas.js";

export const shiftsRouter = Router();

const userOf = (req: import("express").Request) =>
  req.session!.user as unknown as { id: string; role: "ADMIN" | "CAREGIVER" };

shiftsRouter.use(requireAuth);

// GET /api/shifts — list with filters
shiftsRouter.get("/", async (req, res) => {
  const user = userOf(req);
  const { from, to, caregiverId, clientId } = req.query as Record<string, string | undefined>;

  const where: import("@prisma/client").Prisma.ShiftWhereInput = {};
  if (user.role === "CAREGIVER") {
    where.caregiverId = user.id;
  } else if (caregiverId) {
    where.caregiverId = caregiverId;
  }
  if (clientId) where.clientId = clientId;
  if (from || to) {
    where.scheduledStart = {};
    if (from) (where.scheduledStart as { gte?: Date }).gte = new Date(from);
    if (to) (where.scheduledStart as { lte?: Date }).lte = new Date(to);
  }

  const shifts = await prisma.shift.findMany({
    where,
    orderBy: { scheduledStart: "asc" },
    include: {
      caregiver: { select: { id: true, name: true } },
      client: true,
      tasks: { orderBy: { orderIdx: "asc" } },
    },
  });
  res.json(shifts);
});

// GET /api/shifts/:id
shiftsRouter.get("/:id", async (req, res) => {
  const user = userOf(req);
  const shift = await prisma.shift.findUnique({
    where: { id: req.params.id },
    include: {
      caregiver: { select: { id: true, name: true } },
      client: true,
      tasks: { orderBy: { orderIdx: "asc" } },
    },
  });
  if (!shift) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  if (user.role === "CAREGIVER" && shift.caregiverId !== user.id) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  // Map signature bytes to base64 dataURL for client
  const payload = {
    ...shift,
    signaturePng: shift.signaturePng
      ? `data:image/png;base64,${Buffer.from(shift.signaturePng).toString("base64")}`
      : null,
  };
  res.json(payload);
});

// Conflict detection: shifts on the same caregiver whose [start, end) overlaps.
async function findConflicts(
  caregiverId: string,
  start: Date,
  end: Date,
  excludeShiftId?: string,
) {
  return prisma.shift.findMany({
    where: {
      caregiverId,
      status: { notIn: ["CANCELLED"] },
      ...(excludeShiftId ? { id: { not: excludeShiftId } } : {}),
      scheduledStart: { lt: end },
      scheduledEnd: { gt: start },
    },
    select: {
      id: true,
      scheduledStart: true,
      scheduledEnd: true,
      client: { select: { id: true, name: true } },
    },
  });
}

// POST /api/shifts — create (admin)
shiftsRouter.post("/", requireRole("ADMIN"), async (req, res) => {
  const parsed = createShiftSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", issues: parsed.error.issues });
    return;
  }
  const data = parsed.data;
  const start = new Date(data.scheduledStart);
  const end = new Date(data.scheduledEnd);
  if (end <= start) {
    res.status(400).json({ error: "end_before_start" });
    return;
  }

  const force = req.query.force === "true";
  const conflicts = await findConflicts(data.caregiverId, start, end);
  if (conflicts.length > 0 && !force) {
    res.status(409).json({ error: "schedule_conflict", conflicts });
    return;
  }

  const shift = await prisma.shift.create({
    data: {
      caregiverId: data.caregiverId,
      clientId: data.clientId,
      scheduledStart: start,
      scheduledEnd: end,
      status: "SCHEDULED",
      tasks: {
        create: data.tasks.map((t, i) => ({ description: t.description, orderIdx: i })),
      },
    },
    include: {
      caregiver: { select: { id: true, name: true } },
      client: true,
      tasks: { orderBy: { orderIdx: "asc" } },
    },
  });
  res.status(201).json(shift);
});

// PATCH /api/shifts/:id — update (admin, before completion)
shiftsRouter.patch("/:id", requireRole("ADMIN"), async (req, res) => {
  const parsed = updateShiftSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", issues: parsed.error.issues });
    return;
  }
  const data = parsed.data;
  const existing = await prisma.shift.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  if (existing.status === "COMPLETED") {
    res.status(409).json({ error: "already_completed" });
    return;
  }

  const newStart = data.scheduledStart ? new Date(data.scheduledStart) : existing.scheduledStart;
  const newEnd = data.scheduledEnd ? new Date(data.scheduledEnd) : existing.scheduledEnd;
  const newCaregiverId = data.caregiverId ?? existing.caregiverId;
  if (newEnd <= newStart) {
    res.status(400).json({ error: "end_before_start" });
    return;
  }
  const force = req.query.force === "true";
  const conflicts = await findConflicts(newCaregiverId, newStart, newEnd, existing.id);
  if (conflicts.length > 0 && !force) {
    res.status(409).json({ error: "schedule_conflict", conflicts });
    return;
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (data.tasks) {
      await tx.shiftTask.deleteMany({ where: { shiftId: existing.id } });
      await tx.shiftTask.createMany({
        data: data.tasks.map((t, i) => ({
          shiftId: existing.id,
          description: t.description,
          orderIdx: i,
        })),
      });
    }
    return tx.shift.update({
      where: { id: existing.id },
      data: {
        caregiverId: newCaregiverId,
        clientId: data.clientId ?? existing.clientId,
        scheduledStart: newStart,
        scheduledEnd: newEnd,
      },
      include: {
        caregiver: { select: { id: true, name: true } },
        client: true,
        tasks: { orderBy: { orderIdx: "asc" } },
      },
    });
  });

  res.json(updated);
});

// DELETE /api/shifts/:id — soft cancel
shiftsRouter.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  const existing = await prisma.shift.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  await prisma.shift.update({
    where: { id: req.params.id },
    data: { status: "CANCELLED" },
  });
  res.status(204).end();
});

// POST /api/shifts/:id/clock-in (caregiver)
shiftsRouter.post("/:id/clock-in", async (req, res) => {
  const user = userOf(req);
  const parsed = clockInSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", issues: parsed.error.issues });
    return;
  }
  const shift = await prisma.shift.findUnique({
    where: { id: req.params.id },
    include: { client: true },
  });
  if (!shift) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  if (shift.caregiverId !== user.id) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  if (shift.status !== "SCHEDULED") {
    res.status(409).json({ error: "invalid_status", status: shift.status });
    return;
  }
  const outsideFence = isOutsideGeofence(parsed.data, {
    lat: shift.client.lat,
    lng: shift.client.lng,
  });
  const updated = await prisma.shift.update({
    where: { id: shift.id },
    data: {
      status: "IN_PROGRESS",
      clockInAt: new Date(),
      clockInLat: parsed.data.lat,
      clockInLng: parsed.data.lng,
      geofenceFlag: outsideFence,
    },
    include: {
      caregiver: { select: { id: true, name: true } },
      client: true,
      tasks: { orderBy: { orderIdx: "asc" } },
    },
  });
  res.json(updated);
});

// POST /api/shifts/:id/clock-out (caregiver)
shiftsRouter.post("/:id/clock-out", async (req, res) => {
  const user = userOf(req);
  const parsed = clockOutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", issues: parsed.error.issues });
    return;
  }
  const shift = await prisma.shift.findUnique({
    where: { id: req.params.id },
    include: { client: true },
  });
  if (!shift) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  if (shift.caregiverId !== user.id) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  if (shift.status !== "IN_PROGRESS") {
    res.status(409).json({ error: "invalid_status", status: shift.status });
    return;
  }
  const geoFlag = isOutsideGeofence(parsed.data, {
    lat: shift.client.lat,
    lng: shift.client.lng,
  });
  const updated = await prisma.shift.update({
    where: { id: shift.id },
    data: {
      clockOutAt: new Date(),
      clockOutLat: parsed.data.lat,
      clockOutLng: parsed.data.lng,
      geofenceFlag: shift.geofenceFlag || geoFlag,
    },
    include: {
      caregiver: { select: { id: true, name: true } },
      client: true,
      tasks: { orderBy: { orderIdx: "asc" } },
    },
  });
  res.json(updated);
});

// POST /api/shifts/:id/complete (caregiver)
shiftsRouter.post("/:id/complete", async (req, res) => {
  const user = userOf(req);
  const parsed = completeShiftSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", issues: parsed.error.issues });
    return;
  }
  const shift = await prisma.shift.findUnique({
    where: { id: req.params.id },
    include: { tasks: true },
  });
  if (!shift) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  if (shift.caregiverId !== user.id) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  if (shift.status !== "IN_PROGRESS") {
    res.status(409).json({ error: "invalid_status", status: shift.status });
    return;
  }
  if (!shift.clockOutAt) {
    res.status(409).json({ error: "not_clocked_out" });
    return;
  }

  // Decode base64 PNG (strip dataURL prefix if present)
  const b64 = parsed.data.signaturePngBase64.replace(/^data:image\/png;base64,/, "");
  const sigBytes = Buffer.from(b64, "base64");
  if (sigBytes.length < 100) {
    res.status(400).json({ error: "invalid_signature" });
    return;
  }

  const taskUpdates = parsed.data.tasks;
  const now = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    for (const t of taskUpdates) {
      await tx.shiftTask.update({
        where: { id: t.id },
        data: {
          completed: t.completed,
          completedAt: t.completed ? now : null,
        },
      });
    }
    return tx.shift.update({
      where: { id: shift.id },
      data: {
        status: "COMPLETED",
        signaturePng: sigBytes,
        signedByName: parsed.data.signedByName,
        signedAt: now,
        caregiverNotes: parsed.data.caregiverNotes ?? null,
      },
      include: {
        caregiver: { select: { id: true, name: true } },
        client: true,
        tasks: { orderBy: { orderIdx: "asc" } },
      },
    });
  });

  res.json(updated);
});
