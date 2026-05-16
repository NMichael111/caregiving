import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getShift } from "../../api/shifts";
import { formatDateLong, formatTime, durationHours } from "../../lib/dates";
import { GEOFENCE_METERS, haversineMeters } from "../../lib/geofence";

export default function AdminShiftDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: shift, isLoading } = useQuery({
    queryKey: ["shift", id],
    queryFn: () => getShift(id!),
    enabled: !!id,
  });

  if (isLoading) return <div className="text-slate-400">Loading…</div>;
  if (!shift) return <div className="text-slate-500">Shift not found.</div>;

  const clockedHours =
    shift.clockInAt && shift.clockOutAt
      ? durationHours(shift.clockInAt, shift.clockOutAt)
      : null;

  return (
    <div className="space-y-5">
      <div>
        <Link to="/admin/calendar" className="text-sm text-slate-500 hover:text-slate-700">
          ← Calendar
        </Link>
        <div className="mt-1 flex flex-wrap justify-between items-start gap-2">
          <div>
            <h1 className="text-2xl font-semibold">
              {shift.client?.name} <span className="text-slate-400">·</span>{" "}
              {shift.caregiver?.name}
            </h1>
            <p className="text-slate-600 text-sm">
              {formatDateLong(new Date(shift.scheduledStart))} ·{" "}
              {formatTime(shift.scheduledStart)}–{formatTime(shift.scheduledEnd)}
            </p>
          </div>
          <StatusPill status={shift.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card title="Clock in (EVV location)">
          {shift.clockInAt ? (
            <>
              <div className="text-sm">{formatTime(shift.clockInAt)}</div>
              <a
                href={`https://www.google.com/maps?q=${shift.clockInLat},${shift.clockInLng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-600 underline mt-0.5 inline-block"
              >
                {shift.clockInLat?.toFixed(5)}, {shift.clockInLng?.toFixed(5)}
              </a>
              {shift.clockInLat != null && shift.clockInLng != null && (
                <GeoStatus
                  caregiver={{ lat: shift.clockInLat, lng: shift.clockInLng }}
                  client={{ lat: shift.client!.lat, lng: shift.client!.lng }}
                />
              )}
            </>
          ) : (
            <div className="text-slate-400 italic text-sm">Not yet clocked in</div>
          )}
        </Card>
        <Card title="Clock out (EVV location)">
          {shift.clockOutAt ? (
            <>
              <div className="text-sm">{formatTime(shift.clockOutAt)}</div>
              <a
                href={`https://www.google.com/maps?q=${shift.clockOutLat},${shift.clockOutLng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-600 underline mt-0.5 inline-block"
              >
                {shift.clockOutLat?.toFixed(5)}, {shift.clockOutLng?.toFixed(5)}
              </a>
              {shift.clockOutLat != null && shift.clockOutLng != null && (
                <GeoStatus
                  caregiver={{ lat: shift.clockOutLat, lng: shift.clockOutLng }}
                  client={{ lat: shift.client!.lat, lng: shift.client!.lng }}
                />
              )}
              {clockedHours !== null && (
                <div className="text-xs text-slate-600 mt-1">
                  Worked: <strong>{clockedHours.toFixed(2)}h</strong>
                </div>
              )}
            </>
          ) : (
            <div className="text-slate-400 italic text-sm">Not yet clocked out</div>
          )}
        </Card>
      </div>

      <Card title={`Tasks (${shift.tasks.filter((t) => t.completed).length}/${shift.tasks.length})`}>
        {shift.tasks.length === 0 ? (
          <div className="text-sm text-slate-400 italic">No tasks defined.</div>
        ) : (
          <ul className="space-y-1.5">
            {shift.tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2 text-sm">
                <span
                  className={`inline-block h-4 w-4 rounded border ${t.completed ? "bg-emerald-500 border-emerald-500" : "border-slate-300 bg-white"}`}
                  aria-label={t.completed ? "completed" : "not completed"}
                />
                <span className={t.completed ? "line-through text-slate-500" : ""}>
                  {t.description}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {shift.caregiverNotes && (
        <Card title="Caregiver notes">
          <p className="text-sm whitespace-pre-wrap">{shift.caregiverNotes}</p>
        </Card>
      )}

      {shift.signaturePng && (
        <Card title={`Client signature (${shift.signedByName ?? "unsigned"})`}>
          <img
            src={shift.signaturePng}
            alt="Client signature"
            className="max-h-32 bg-white border border-slate-200 rounded"
          />
          {shift.signedAt && (
            <p className="text-xs text-slate-500 mt-1">
              Signed {formatTime(shift.signedAt)}
            </p>
          )}
        </Card>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">{title}</h3>
      {children}
    </div>
  );
}

function GeoStatus({
  caregiver,
  client,
}: {
  caregiver: { lat: number; lng: number };
  client: { lat: number; lng: number };
}) {
  const m = haversineMeters(caregiver, client);
  const outside = m > GEOFENCE_METERS;
  return (
    <div
      className={`mt-1 text-xs rounded px-2 py-0.5 inline-block ${
        outside
          ? "text-red-700 bg-red-50 border border-red-200"
          : "text-emerald-700 bg-emerald-50 border border-emerald-200"
      }`}
    >
      {m < 1000
        ? `${Math.round(m)}m from client`
        : `${(m / 1000).toFixed(1)}km from client`}
      {outside
        ? ` — exceeds ${GEOFENCE_METERS}m geofence`
        : ` — within ${GEOFENCE_METERS}m geofence`}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    SCHEDULED: "bg-slate-100 text-slate-700",
    IN_PROGRESS: "bg-amber-100 text-amber-800",
    COMPLETED: "bg-emerald-100 text-emerald-800",
    CANCELLED: "bg-slate-100 text-slate-400",
    MISSED: "bg-red-100 text-red-800",
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] ?? "bg-slate-100"}`}>
      {status.replace("_", " ").toLowerCase()}
    </span>
  );
}
