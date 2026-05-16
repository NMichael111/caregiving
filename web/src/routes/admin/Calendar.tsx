import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../../components/Button";
import { listShifts } from "../../api/shifts";
import type { Shift } from "../../lib/types";
import {
  addDays,
  formatDateLong,
  formatTime,
  isSameDay,
  startOfWeek,
} from "../../lib/dates";
import { ShiftFormModal } from "./ShiftFormModal";

const STATUS_COLORS: Record<Shift["status"], string> = {
  SCHEDULED: "bg-slate-100 border-slate-300 text-slate-700",
  IN_PROGRESS: "bg-amber-100 border-amber-300 text-amber-800",
  COMPLETED: "bg-emerald-100 border-emerald-300 text-emerald-800",
  CANCELLED: "bg-slate-50 border-slate-200 text-slate-400 line-through",
  MISSED: "bg-red-100 border-red-300 text-red-800",
};

export default function AdminCalendar() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [modalOpen, setModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | undefined>(undefined);

  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ["shifts", weekStart.toISOString(), weekEnd.toISOString()],
    queryFn: () =>
      listShifts({
        from: weekStart.toISOString(),
        to: weekEnd.toISOString(),
      }),
  });

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const shiftsByDay = useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const day of days) map.set(day.toISOString(), []);
    for (const s of shifts) {
      const dayKey = days.find((d) => isSameDay(d, new Date(s.scheduledStart)))?.toISOString();
      if (dayKey) map.get(dayKey)?.push(s);
    }
    return map;
  }, [days, shifts]);

  function openCreate(date: Date) {
    setEditingShift(null);
    setDefaultDate(date);
    setModalOpen(true);
  }

  function openEdit(shift: Shift) {
    setEditingShift(shift);
    setDefaultDate(undefined);
    setModalOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Calendar</h1>
        <div className="flex gap-2 items-center">
          <Button variant="secondary" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            ← Prev
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>
            Today
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            Next →
          </Button>
        </div>
      </div>

      <div className="text-sm text-slate-500">
        Week of {formatDateLong(weekStart)} {isLoading && "(loading…)"}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {days.map((day) => {
          const dayShifts = (shiftsByDay.get(day.toISOString()) ?? []).slice().sort(
            (a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime(),
          );
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={day.toISOString()}
              className={`rounded-lg border ${isToday ? "border-brand-300 bg-brand-50/30" : "border-slate-200 bg-white"} p-3 min-h-[140px]`}
            >
              <div className="flex justify-between items-center mb-2">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {day.toLocaleDateString(undefined, { weekday: "short" })}
                  </div>
                  <div className="text-base font-semibold">{day.getDate()}</div>
                </div>
                <button
                  type="button"
                  onClick={() => openCreate(day)}
                  className="text-slate-400 hover:text-brand-600 text-lg leading-none"
                  aria-label={`Add shift on ${formatDateLong(day)}`}
                  title="Add shift"
                >
                  +
                </button>
              </div>
              <div className="space-y-1.5">
                {dayShifts.length === 0 && (
                  <div className="text-xs text-slate-400 italic">No shifts</div>
                )}
                {dayShifts.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => openEdit(s)}
                    className={`w-full text-left rounded border px-2 py-1.5 text-xs ${STATUS_COLORS[s.status]} hover:opacity-80`}
                  >
                    <div className="font-medium truncate">
                      {formatTime(s.scheduledStart)} {s.client?.name ?? ""}
                    </div>
                    <div className="text-[10px] truncate">
                      {s.caregiver?.name ?? ""}
                      {s.geofenceFlag && <span className="text-red-600 font-medium"> · ⚑</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <ShiftFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        shift={editingShift}
        defaultDate={defaultDate}
      />
    </div>
  );
}
