import express from "express";
import helmet from "helmet";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import { meRouter } from "./routes/me.js";
import { clientsRouter } from "./routes/clients.js";
import { caregiversRouter } from "./routes/caregivers.js";
import { shiftsRouter } from "./routes/shifts.js";
import { messagesRouter } from "./routes/messages.js";
import { timesheetsRouter } from "./routes/timesheets.js";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));

// Better-auth handler must come BEFORE express.json() — it parses the body itself.
app.all("/api/auth/*", toNodeHandler(auth));

app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.use("/api/me", meRouter);
app.use("/api/clients", clientsRouter);
app.use("/api/caregivers", caregiversRouter);
app.use("/api/shifts", shiftsRouter);

// Messages router handles both /api/threads/* and /api/messages/stream
app.use("/api", messagesRouter);
app.use("/api/timesheets", timesheetsRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[api]", err);
  if (res.headersSent) return;
  res.status(500).json({ error: "internal_error" });
});

app.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`);
});
