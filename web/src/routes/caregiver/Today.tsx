import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listShifts } from "../../api/shifts";
import { startOfDay, endOfDay, formatTime, durationHours } from "../../lib/dates";
import type { Shift } from "../../lib/types";

export default function CaregiverToday() {
  const now = new Date();
  const from = startOfDay(now).toISOString();
  const to = endOfDay(now).toISOString();
  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ["my-shifts", "today", from],
    queryFn: () => listShifts({ from, to }),
  });

  const active = shifts.find((s) => s.status === "IN_PROGRESS");
  const upcoming = shifts.filter(
    (s) => s.status === "SCHEDULED" && new Date(s.scheduledStart) >= now,
  );
  const past = shifts.filter((s) => s.status === "COMPLETED" || s.status === "CANCELLED");

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Today</h1>

      {isLoading && <div className="text-slate-400">Loading…</div>}

      {active && (
        <section>
          <h2 className="text-xs uppercase tracking-wide text-amber-700 mb-2">
            In progress
          </h2>
          <ShiftCard shift={active} highlight />
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-wide text-slate-500 mb-2">
            Upcoming today
          </h2>
          <div className="space-y-2">
            {upcoming.map((s) => (
              <ShiftCard key={s.id} shift={s} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-wide text-slate-500 mb-2">
            Earlier today
          </h2>
          <div className="space-y-2">
            {past.map((s) => (
              <ShiftCard key={s.id} shift={s} />
            ))}
          </div>
        </section>
      )}

      {!isLoading && shifts.length === 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-500">
          No shifts scheduled today.
        </div>
      )}
    </div>
  );
}

function ShiftCard({ shift, highlight = false }: { shift: Shift; highlight?: boolean }) {
  return (
    <Link
      to={`/caregiver/shifts/${shift.id}`}
      className={`block rounded-lg border p-4 ${highlight ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="text-lg font-semibold">{shift.client?.name}</div>
          <div className="text-sm text-slate-600">{shift.client?.address}</div>
        </div>
        <div className="text-right text-sm">
          <div className="font-medium">
            {formatTime(shift.scheduledStart)}–{formatTime(shift.scheduledEnd)}
          </div>
          <div className="text-slate-500 text-xs">
            {durationHours(shift.scheduledStart, shift.scheduledEnd).toFixed(1)}h
          </div>
        </div>
      </div>
      {shift.tasks.length > 0 && (
        <div className="mt-2 text-xs text-slate-600">
          {shift.tasks.length} task{shift.tasks.length !== 1 ? "s" : ""}
          {highlight && (
            <span className="ml-2">
              · {shift.tasks.filter((t) => t.completed).length} done
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
