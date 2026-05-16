import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCaregiver } from "../../api/caregivers";
import { formatDateShort, formatTime } from "../../lib/dates";

export default function AdminCaregiverDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: caregiver, isLoading } = useQuery({
    queryKey: ["caregiver", id],
    queryFn: () => getCaregiver(id!),
    enabled: !!id,
  });

  if (isLoading) return <div className="text-slate-400">Loading…</div>;
  if (!caregiver) return <div className="text-slate-500">Caregiver not found.</div>;

  const upcoming = caregiver.shifts.filter(
    (s) => new Date(s.scheduledStart) >= new Date() && s.status !== "CANCELLED",
  );
  const past = caregiver.shifts.filter((s) => new Date(s.scheduledStart) < new Date());
  const possiblyTruncated = caregiver.shifts.length >= 50;

  return (
    <div className="space-y-5">
      <div>
        <Link to="/admin/caregivers" className="text-sm text-slate-500 hover:text-slate-700">
          ← Caregivers
        </Link>
        <h1 className="text-2xl font-semibold mt-1">{caregiver.name}</h1>
        <p className="text-slate-600 text-sm">{caregiver.email}</p>
      </div>

      <div>
        <h2 className="font-medium text-slate-700 mb-2">Upcoming ({upcoming.length})</h2>
        <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1.5">
          {upcoming.length === 0 ? (
            <div className="text-sm text-slate-400 italic">None scheduled.</div>
          ) : (
            upcoming.map((s) => <Row key={s.id} s={s} />)
          )}
        </div>
      </div>

      <div>
        <h2 className="font-medium text-slate-700 mb-2">Past ({past.length})</h2>
        <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1.5">
          {past.length === 0 ? (
            <div className="text-sm text-slate-400 italic">No history.</div>
          ) : (
            past.map((s) => <Row key={s.id} s={s} />)
          )}
          {possiblyTruncated && (
            <p className="text-xs text-slate-400 italic pt-1">
              Showing 50 most recent shifts. Older history not loaded.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ s }: { s: { id: string; scheduledStart: string; scheduledEnd: string; status: string; client: { name: string } } }) {
  return (
    <Link
      to={`/admin/shifts/${s.id}`}
      className="flex justify-between items-center text-sm hover:bg-slate-50 -mx-3 px-3 py-1.5 rounded"
    >
      <div>
        <span className="font-medium">{formatDateShort(s.scheduledStart)}</span>{" "}
        <span className="text-slate-500">
          {formatTime(s.scheduledStart)}–{formatTime(s.scheduledEnd)}
        </span>{" "}
        <span className="text-slate-600">· {s.client.name}</span>
      </div>
      <span className="text-xs text-slate-400">{s.status}</span>
    </Link>
  );
}
