import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listShifts } from "../../api/shifts";
import { startOfDay, endOfDay, formatTime } from "../../lib/dates";
import type { Shift } from "../../lib/types";

export default function AdminToday() {
  const now = new Date();
  const from = startOfDay(now).toISOString();
  const to = endOfDay(now).toISOString();
  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ["shifts", "today", from],
    queryFn: () => listShifts({ from, to }),
  });

  const counts: Record<Shift["status"], number> = {
    SCHEDULED: 0,
    IN_PROGRESS: 0,
    COMPLETED: 0,
    CANCELLED: 0,
    MISSED: 0,
  };
  for (const s of shifts) counts[s.status]++;

  const inProgress = shifts.filter((s) => s.status === "IN_PROGRESS");

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Today</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Metric label="Scheduled" value={counts.SCHEDULED} />
        <Metric label="In progress" value={counts.IN_PROGRESS} tone="amber" />
        <Metric label="Completed" value={counts.COMPLETED} tone="emerald" />
        <Metric label="Cancelled" value={counts.CANCELLED} tone="slate" />
      </div>

      <div>
        <h2 className="font-medium text-slate-700 mb-2">In progress</h2>
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          {isLoading ? (
            <div className="text-slate-400 text-sm">Loading…</div>
          ) : inProgress.length === 0 ? (
            <div className="text-slate-400 text-sm italic">No active visits right now.</div>
          ) : (
            <ul className="space-y-2">
              {inProgress.map((s) => (
                <li key={s.id}>
                  <Link
                    to={`/admin/shifts/${s.id}`}
                    className="flex items-center justify-between text-sm hover:bg-slate-50 -mx-1 px-2 py-1 rounded"
                  >
                    <div>
                      <span className="font-medium">{s.caregiver?.name}</span>{" "}
                      <span className="text-slate-500">with</span>{" "}
                      <span className="font-medium">{s.client?.name}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Clocked in {s.clockInAt && formatTime(s.clockInAt)}
                      {s.geofenceFlag && <span className="text-red-600 font-medium"> · ⚑ geofence</span>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number;
  tone?: "slate" | "amber" | "emerald";
}) {
  const tones = {
    slate: "bg-white border-slate-200",
    amber: "bg-amber-50 border-amber-200",
    emerald: "bg-emerald-50 border-emerald-200",
  };
  return (
    <div className={`rounded-lg border ${tones[tone]} p-3`}>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
