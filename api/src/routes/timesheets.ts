import { Router } from "express";
import { prisma } from "../lib/db.js";
import { requireRole } from "../lib/middleware.js";

export const timesheetsRouter = Router();
timesheetsRouter.use(requireRole("ADMIN"));

interface TimesheetRow {
  shiftId: string;
  caregiverId: string;
  caregiverName: string;
  clientName: string;
  scheduledStart: string;
  scheduledEnd: string;
  clockInAt: string | null;
  clockOutAt: string | null;
  hoursWorked: number;
  geofenceFlag: boolean;
}

async function buildRows(params: {
  caregiverId?: string;
  from?: Date;
  to?: Date;
}): Promise<{ rows: TimesheetRow[]; totalHours: number }> {
  const shifts = await prisma.shift.findMany({
    where: {
      status: "COMPLETED",
      ...(params.caregiverId ? { caregiverId: params.caregiverId } : {}),
      scheduledStart: {
        ...(params.from ? { gte: params.from } : {}),
        ...(params.to ? { lte: params.to } : {}),
      },
    },
    include: {
      caregiver: { select: { id: true, name: true } },
      client: { select: { name: true } },
    },
    orderBy: { scheduledStart: "asc" },
  });
  let totalHours = 0;
  const rows: TimesheetRow[] = shifts.map((s) => {
    const hours =
      s.clockInAt && s.clockOutAt
        ? (s.clockOutAt.getTime() - s.clockInAt.getTime()) / 3_600_000
        : 0;
    totalHours += hours;
    return {
      shiftId: s.id,
      caregiverId: s.caregiverId,
      caregiverName: s.caregiver.name,
      clientName: s.client.name,
      scheduledStart: s.scheduledStart.toISOString(),
      scheduledEnd: s.scheduledEnd.toISOString(),
      clockInAt: s.clockInAt?.toISOString() ?? null,
      clockOutAt: s.clockOutAt?.toISOString() ?? null,
      hoursWorked: Math.round(hours * 100) / 100,
      geofenceFlag: s.geofenceFlag,
    };
  });
  return { rows, totalHours: Math.round(totalHours * 100) / 100 };
}

function parseDate(s: string | undefined): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

timesheetsRouter.get("/", async (req, res) => {
  const result = await buildRows({
    caregiverId: (req.query.caregiverId as string | undefined) || undefined,
    from: parseDate(req.query.from as string | undefined),
    to: parseDate(req.query.to as string | undefined),
  });
  res.json(result);
});

timesheetsRouter.get("/export", async (req, res) => {
  const { rows, totalHours } = await buildRows({
    caregiverId: (req.query.caregiverId as string | undefined) || undefined,
    from: parseDate(req.query.from as string | undefined),
    to: parseDate(req.query.to as string | undefined),
  });
  const headers = [
    "shift_id",
    "caregiver",
    "client",
    "scheduled_start",
    "scheduled_end",
    "clock_in_at",
    "clock_out_at",
    "hours_worked",
    "geofence_flag",
  ];
  const escape = (v: unknown): string => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.shiftId,
        r.caregiverName,
        r.clientName,
        r.scheduledStart,
        r.scheduledEnd,
        r.clockInAt ?? "",
        r.clockOutAt ?? "",
        r.hoursWorked.toFixed(2),
        r.geofenceFlag ? "Y" : "N",
      ]
        .map(escape)
        .join(","),
    );
  }
  lines.push("");
  lines.push(`# total hours,${totalHours.toFixed(2)}`);
  const csv = lines.join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="timesheet-${new Date().toISOString().slice(0, 10)}.csv"`,
  );
  res.send(csv);
});
