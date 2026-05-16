import { Router } from "express";
import { prisma } from "../lib/db.js";
import { requireAuth, requireRole } from "../lib/middleware.js";
import { sse } from "../lib/sse.js";
import { createThreadSchema, sendMessageSchema } from "../schemas.js";

export const messagesRouter = Router();

const userOf = (req: import("express").Request) =>
  req.session!.user as unknown as { id: string; role: "ADMIN" | "CAREGIVER" };

// SSE stream — needs auth but NOT JSON body parsing
messagesRouter.get("/messages/stream", requireAuth, (req, res) => {
  const user = userOf(req);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
  res.write(`event: ready\ndata: {}\n\n`);

  sse.add(user.id, res);

  const heartbeat = setInterval(() => {
    try {
      res.write(`: ping\n\n`);
    } catch {
      // ignore
    }
  }, 30_000);

  req.on("close", () => {
    clearInterval(heartbeat);
    sse.remove(user.id, res);
  });
});

// All other endpoints require auth
messagesRouter.use(requireAuth);

// GET /api/threads
messagesRouter.get("/threads", async (req, res) => {
  const user = userOf(req);
  const threads = await prisma.messageThread.findMany({
    where: { members: { some: { userId: user.id } } },
    include: {
      members: { include: { user: { select: { id: true, name: true, role: true } } } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { sender: { select: { id: true, name: true } } },
      },
    },
  });
  // Project: derive display name for DMs (other person's name) + last message
  const projected = threads.map((t) => {
    const others = t.members
      .filter((m) => m.user.id !== user.id)
      .map((m) => m.user);
    const displayName = t.name ?? others.map((o) => o.name).join(", ");
    return {
      id: t.id,
      name: t.name,
      displayName,
      createdAt: t.createdAt,
      members: t.members.map((m) => m.user),
      lastMessage: t.messages[0] ?? null,
    };
  });
  // Sort by lastMessage.createdAt desc, with no-message threads at the end by createdAt
  projected.sort((a, b) => {
    const ta = a.lastMessage?.createdAt ?? a.createdAt;
    const tb = b.lastMessage?.createdAt ?? b.createdAt;
    return new Date(tb).getTime() - new Date(ta).getTime();
  });
  res.json(projected);
});

// POST /api/threads — create thread (admin only)
messagesRouter.post("/threads", requireRole("ADMIN"), async (req, res) => {
  const parsed = createThreadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", issues: parsed.error.issues });
    return;
  }
  const user = userOf(req);
  const memberIds = Array.from(new Set([user.id, ...parsed.data.memberIds]));
  const thread = await prisma.messageThread.create({
    data: {
      name: parsed.data.name ?? null,
      members: { create: memberIds.map((userId) => ({ userId })) },
    },
    include: {
      members: { include: { user: { select: { id: true, name: true, role: true } } } },
    },
  });
  res.status(201).json(thread);
});

// GET /api/threads/:id/messages
messagesRouter.get("/threads/:id/messages", async (req, res) => {
  const user = userOf(req);
  const member = await prisma.threadMember.findUnique({
    where: { threadId_userId: { threadId: req.params.id, userId: user.id } },
  });
  if (!member) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const before = (req.query.before as string | undefined) ?? undefined;
  const messages = await prisma.message.findMany({
    where: {
      threadId: req.params.id,
      ...(before ? { createdAt: { lt: new Date(before) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { sender: { select: { id: true, name: true } } },
  });
  // Return oldest-first for natural display
  res.json(messages.reverse());
});

// POST /api/threads/:id/messages
messagesRouter.post("/threads/:id/messages", async (req, res) => {
  const parsed = sendMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", issues: parsed.error.issues });
    return;
  }
  const user = userOf(req);
  const member = await prisma.threadMember.findUnique({
    where: { threadId_userId: { threadId: req.params.id, userId: user.id } },
  });
  if (!member) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const message = await prisma.message.create({
    data: {
      threadId: req.params.id,
      senderId: user.id,
      body: parsed.data.body,
    },
    include: { sender: { select: { id: true, name: true } } },
  });
  const members = await prisma.threadMember.findMany({
    where: { threadId: req.params.id },
    select: { userId: true },
  });
  sse.publish(
    members.map((m) => m.userId),
    { event: "message", data: { threadId: req.params.id, message } },
  );
  res.status(201).json(message);
});
