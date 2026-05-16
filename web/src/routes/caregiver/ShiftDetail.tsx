import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/Button";
import { clockIn, clockOut, getShift } from "../../api/shifts";
import { getCurrentPosition } from "../../lib/geolocation";
import { formatDateLong, formatTime, durationHours } from "../../lib/dates";
import { CompleteShiftFlow } from "./CompleteShiftFlow";

export default function CaregiverShiftDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [showComplete, setShowComplete] = useState(false);

  const { data: shift, isLoading } = useQuery({
    queryKey: ["shift", id],
    queryFn: () => getShift(id!),
    enabled: !!id,
  });

  const clockInMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      const pos = await getCurrentPosition();
      return clockIn(id!, { lat: pos.lat, lng: pos.lng });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["shift", id], updated);
      queryClient.invalidateQueries({ queryKey: ["my-shifts"] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Clock-in failed"),
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      const pos = await getCurrentPosition();
      return clockOut(id!, { lat: pos.lat, lng: pos.lng });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["shift", id], updated);
      queryClient.invalidateQueries({ queryKey: ["my-shifts"] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Clock-out failed"),
  });

  if (isLoading) return <div className="text-slate-400">Loading…</div>;
  if (!shift) return <div className="text-slate-500">Shift not found.</div>;

  const canClockIn = shift.status === "SCHEDULED";
  const canClockOut = shift.status === "IN_PROGRESS" && !shift.clockOutAt;
  const canComplete = shift.status === "IN_PROGRESS" && !!shift.clockOutAt;
  const isCompleted = shift.status === "COMPLETED";

  return (
    <div className="space-y-5">
      <Link to="/caregiver/today" className="text-sm text-slate-500 hover:text-slate-700">
        ← Today
      </Link>

      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
        <h1 className="text-xl font-semibold">{shift.client?.name}</h1>
        <p className="text-slate-600 text-sm">{shift.client?.address}</p>
        <p className="text-sm">
          {formatDateLong(new Date(shift.scheduledStart))} ·{" "}
          {formatTime(shift.scheduledStart)}–{formatTime(shift.scheduledEnd)}
        </p>
        {shift.client?.notes && (
          <div className="mt-2 rounded bg-slate-50 border border-slate-200 p-2 text-xs text-slate-700 whitespace-pre-wrap">
            <strong className="block text-slate-500 mb-0.5">Notes</strong>
            {shift.client.notes}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {canClockIn && (
        <Button
          size="lg"
          className="w-full"
          onClick={() => clockInMutation.mutate()}
          disabled={clockInMutation.isPending}
        >
          {clockInMutation.isPending ? "Getting location…" : "Clock In"}
        </Button>
      )}

      {shift.clockInAt && (
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Clocked in</span>
            <span className="font-medium">{formatTime(shift.clockInAt)}</span>
          </div>
          {shift.geofenceFlag && (
            <div className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
              Outside 150m geofence — you were not near the client's address at clock-in. Flagged for review.
            </div>
          )}
        </div>
      )}

      {shift.tasks.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <h2 className="text-xs uppercase tracking-wide text-slate-500 mb-2">Tasks</h2>
          <ul className="space-y-1.5">
            {shift.tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2 text-sm">
                <span
                  className={`inline-block h-4 w-4 rounded border ${t.completed ? "bg-emerald-500 border-emerald-500" : "border-slate-300 bg-white"}`}
                />
                <span className={t.completed ? "line-through text-slate-500" : ""}>
                  {t.description}
                </span>
              </li>
            ))}
          </ul>
          {canClockOut && (
            <p className="text-xs text-slate-500 mt-2">
              You'll check off completed tasks when you submit the shift.
            </p>
          )}
        </div>
      )}

      {canClockOut && (
        <Button
          size="lg"
          className="w-full"
          onClick={() => clockOutMutation.mutate()}
          disabled={clockOutMutation.isPending}
        >
          {clockOutMutation.isPending ? "Getting location…" : "Clock Out"}
        </Button>
      )}

      {shift.clockOutAt && (
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Clocked out</span>
            <span className="font-medium">{formatTime(shift.clockOutAt)}</span>
          </div>
          {shift.clockInAt && (
            <div className="flex justify-between mt-1">
              <span className="text-slate-500">Hours worked</span>
              <span className="font-medium">
                {durationHours(shift.clockInAt, shift.clockOutAt).toFixed(2)}h
              </span>
            </div>
          )}
        </div>
      )}

      {canComplete && (
        <Button size="lg" className="w-full" onClick={() => setShowComplete(true)}>
          Complete shift &amp; get signature
        </Button>
      )}

      {isCompleted && shift.signaturePng && (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <h2 className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">
            Signed by {shift.signedByName}
          </h2>
          <img
            src={shift.signaturePng}
            alt="Client signature"
            className="max-h-32 bg-white border border-slate-200 rounded"
          />
        </div>
      )}

      {isCompleted && (
        <Button
          variant="secondary"
          size="md"
          className="w-full"
          onClick={() => navigate("/caregiver/today")}
        >
          Back to today
        </Button>
      )}

      <CompleteShiftFlow
        shift={shift}
        open={showComplete}
        onOpenChange={setShowComplete}
      />
    </div>
  );
}
