import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listShifts } from "../../api/shifts";
import { addDays, endOfDay, formatDateShort, formatTime, startOfDay } from "../../lib/dates";
import type { Shift } from "../../lib/types";

export default function CaregiverUpcoming() {
  const now = new Date();
  const from = startOfDay(addDays(now, 1)).toISOString();
  const to = endOfDay(addDays(now, 30)).toISOString();
  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ["my-shifts", "upcoming", from],
    queryFn: () => listShifts({ from, to }),
  });

  const byDay = useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const s of shifts) {
      if (s.status === "CANCELLED") continue;
      const day = startOfDay(new Date(s.scheduledStart)).toISOString();
      const list = map.get(day) ?? [];
      list.push(s);
      map.set(day, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [shifts]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Upcoming</h1>
      {isLoading && <div className="text-slate-400">Loading…</div>}

      {!isLoading && byDay.length === 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-500">
          Nothing scheduled in the next 30 days.
        </div>
      )}

      {byDay.map(([dayIso, dayShifts]) => (
        <section key={dayIso}>
          <h2 className="text-xs uppercase tracking-wide text-slate-500 mb-2">
            {formatDateShort(new Date(dayIso))}
          </h2>
          <div className="space-y-2">
            {dayShifts.map((s) => (
              <Link
                key={s.id}
                to={`/caregiver/shifts/${s.id}`}
                className="block rounded-lg border border-slate-200 bg-white p-3 hover:bg-slate-50"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">{s.client?.name}</div>
                    <div className="text-sm text-slate-600 truncate">{s.client?.address}</div>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <div className="text-xs text-slate-500">
                      {formatDateShort(s.scheduledStart)}
                    </div>
                    <div className="text-sm font-medium">
                      {formatTime(s.scheduledStart)}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
