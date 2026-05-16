import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "../../components/Button";
import { listShifts } from "../../api/shifts";
import { addDays, formatDateShort, formatTime } from "../../lib/dates";

const PAGE_DAYS = 60;

export default function CaregiverHistory() {
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["my-shifts", "history"],
    // pageParam is the days-back offset for the START of this page's window.
    // page 0: [-60, 0]   page 1: [-120, -60]   page 2: [-180, -120]   ...
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const offset = pageParam as number;
      const to = addDays(new Date(), -offset).toISOString();
      const from = addDays(new Date(), -offset - PAGE_DAYS).toISOString();
      return listShifts({ from, to });
    },
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      // Stop loading once we hit a window with no completed shifts AND we've
      // already loaded at least one window. (Avoids stopping at the first
      // empty page when there's still history further back, but in practice
      // for a single caregiver, an empty 60-day window is a reasonable bound.)
      const offset = lastPageParam as number;
      if (offset > 0 && lastPage.filter((s) => s.status === "COMPLETED").length === 0) {
        return undefined;
      }
      // Hard cap to avoid runaway loading
      if (offset >= 365 * 5) return undefined;
      return offset + PAGE_DAYS;
    },
  });

  const completed = useMemo(() => {
    if (!data) return [];
    return data.pages
      .flat()
      .filter((s) => s.status === "COMPLETED")
      .sort(
        (a, b) => new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime(),
      );
  }, [data]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">History</h1>
      {isLoading && <div className="text-slate-400">Loading…</div>}

      {!isLoading && completed.length === 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-500">
          No completed shifts yet.
        </div>
      )}

      <div className="space-y-2">
        {completed.map((s) => (
          <Link
            key={s.id}
            to={`/caregiver/shifts/${s.id}`}
            className="block rounded-lg border border-slate-200 bg-white p-3 hover:bg-slate-50"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">{s.client?.name}</div>
                <div className="text-sm text-slate-500">
                  {formatDateShort(s.scheduledStart)} · {formatTime(s.scheduledStart)}–
                  {formatTime(s.scheduledEnd)}
                </div>
              </div>
              {s.geofenceFlag && <span className="text-red-600 text-xs font-medium">⚑ geofence</span>}
            </div>
          </Link>
        ))}
      </div>

      {hasNextPage && (
        <div className="flex justify-center pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading…" : "Load older shifts"}
          </Button>
        </div>
      )}

      {!hasNextPage && completed.length > 0 && (
        <p className="text-center text-xs text-slate-400 pt-2">No older shifts.</p>
      )}
    </div>
  );
}
