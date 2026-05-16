import { Router } from "express";
import { prisma } from "../lib/db.js";
import { requireRole } from "../lib/middleware.js";
import { geocodeAddress } from "../lib/geocode.js";
import { createClientSchema, updateClientSchema } from "../schemas.js";

export const clientsRouter = Router();
clientsRouter.use(requireRole("ADMIN"));

clientsRouter.get("/", async (_req, res) => {
  const clients = await prisma.client.findMany({ orderBy: { name: "asc" } });
  res.json(clients);
});

clientsRouter.get("/:id", async (req, res) => {
  const client = await prisma.client.findUnique({
    where: { id: req.params.id },
    include: {
      shifts: {
        orderBy: { scheduledStart: "desc" },
        take: 50,
        include: { caregiver: { select: { id: true, name: true } } },
      },
    },
  });
  if (!client) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(client);
});

clientsRouter.post("/", async (req, res) => {
  const parsed = createClientSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", issues: parsed.error.issues });
    return;
  }
  const data = parsed.data;
  let lat = data.lat;
  let lng = data.lng;
  if (lat === undefined || lng === undefined) {
    const geo = await geocodeAddress(data.address);
    if (!geo) {
      res.status(422).json({
        error: "geocode_failed",
        message: "Could not geocode address. Pass lat/lng explicitly to override.",
      });
      return;
    }
    lat = geo.lat;
    lng = geo.lng;
  }
  const client = await prisma.client.create({
    data: {
      name: data.name,
      address: data.address,
      lat,
      lng,
      notes: data.notes ?? null,
    },
  });
  res.status(201).json(client);
});

clientsRouter.patch("/:id", async (req, res) => {
  const parsed = updateClientSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", issues: parsed.error.issues });
    return;
  }
  const data = parsed.data;
  const existing = await prisma.client.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  let lat = data.lat ?? existing.lat;
  let lng = data.lng ?? existing.lng;
  if (data.address && data.address !== existing.address && data.lat === undefined && data.lng === undefined) {
    const geo = await geocodeAddress(data.address);
    if (geo) {
      lat = geo.lat;
      lng = geo.lng;
    }
  }
  const client = await prisma.client.update({
    where: { id: req.params.id },
    data: {
      name: data.name ?? existing.name,
      address: data.address ?? existing.address,
      lat,
      lng,
      notes: data.notes !== undefined ? data.notes : existing.notes,
    },
  });
  res.json(client);
});
