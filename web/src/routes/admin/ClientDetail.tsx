import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getClient, updateClient } from "../../api/clients";
import { Button } from "../../components/Button";
import { Input, Textarea } from "../../components/Input";
import { Modal } from "../../components/Modal";
import { formatDateShort, formatTime } from "../../lib/dates";

export default function AdminClientDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", id],
    queryFn: () => getClient(id!),
    enabled: !!id,
  });

  if (isLoading) return <div className="text-slate-400">Loading…</div>;
  if (!client) return <div className="text-slate-500">Client not found.</div>;

  const upcoming = client.shifts.filter(
    (s) => new Date(s.scheduledStart) >= new Date() && s.status !== "CANCELLED",
  );
  const past = client.shifts.filter((s) => new Date(s.scheduledStart) < new Date());
  const possiblyTruncated = client.shifts.length >= 50;

  return (
    <div className="space-y-5">
      <div>
        <Link to="/admin/clients" className="text-sm text-slate-500 hover:text-slate-700">
          ← Clients
        </Link>
        <div className="flex justify-between items-start mt-1">
          <div>
            <h1 className="text-2xl font-semibold">{client.name}</h1>
            <p className="text-slate-600 text-sm">{client.address}</p>
            <p className="text-xs text-slate-400 mt-1">
              {client.lat.toFixed(4)}, {client.lng.toFixed(4)}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </div>
      </div>

      {client.notes && (
        <div className="rounded-md bg-slate-50 border border-slate-200 p-3 text-sm whitespace-pre-wrap">
          {client.notes}
        </div>
      )}

      <Section title={`Upcoming (${upcoming.length})`}>
        {upcoming.length === 0 ? (
          <div className="text-sm text-slate-400 italic">None scheduled.</div>
        ) : (
          upcoming.map((s) => <ShiftRow key={s.id} s={s} />)
        )}
      </Section>

      <Section title={`Past (${past.length})`}>
        {past.length === 0 ? (
          <div className="text-sm text-slate-400 italic">No history.</div>
        ) : (
          past.map((s) => <ShiftRow key={s.id} s={s} />)
        )}
        {possiblyTruncated && (
          <p className="text-xs text-slate-400 italic pt-1">
            Showing 50 most recent shifts. Older history not loaded.
          </p>
        )}
      </Section>

      <EditClientModal
        client={client}
        open={editing}
        onOpenChange={setEditing}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["client", id] })}
      />
    </div>
  );
}

function EditClientModal({
  client,
  open,
  onOpenChange,
  onSaved,
}: {
  client: NonNullable<Awaited<ReturnType<typeof getClient>>>;
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [showOverride, setShowOverride] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(client.name);
    setAddress(client.address);
    setNotes(client.notes ?? "");
    setLat("");
    setLng("");
    setShowOverride(false);
    setError(null);
  }, [open, client]);

  const mutation = useMutation({
    mutationFn: () =>
      updateClient(client.id, {
        name,
        address,
        notes: notes || null,
        lat: lat ? parseFloat(lat) : undefined,
        lng: lng ? parseFloat(lng) : undefined,
      }),
    onSuccess: () => {
      onSaved();
      onOpenChange(false);
    },
    onError: (err: Error & { body?: { error?: string; message?: string } }) => {
      if (err.body?.error === "geocode_failed") {
        setShowOverride(true);
        setError("Could not look up that address. Enter lat/lng manually.");
      } else {
        setError(err.message);
      }
    },
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    mutation.mutate();
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Edit client">
      <form onSubmit={onSubmit} className="space-y-3">
        <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input
          label="Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          hint="Changing the address will re-geocode for EVV."
          required
        />
        <Textarea
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />

        {showOverride && (
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Latitude"
              type="number"
              step="any"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
            />
            <Input
              label="Longitude"
              type="number"
              step="any"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
            />
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-medium text-slate-700 mb-2">{title}</h2>
      <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
        <div className="p-3 space-y-2">{children}</div>
      </div>
    </div>
  );
}

function ShiftRow({ s }: { s: { id: string; scheduledStart: string; scheduledEnd: string; status: string; caregiver: { name: string } } }) {
  return (
    <Link to={`/admin/shifts/${s.id}`} className="flex justify-between items-center text-sm hover:bg-slate-50 -mx-3 px-3 py-1.5 rounded">
      <div>
        <span className="font-medium">{formatDateShort(s.scheduledStart)}</span>{" "}
        <span className="text-slate-500">
          {formatTime(s.scheduledStart)}–{formatTime(s.scheduledEnd)}
        </span>{" "}
        <span className="text-slate-600">· {s.caregiver.name}</span>
      </div>
      <span className="text-xs text-slate-400">{s.status}</span>
    </Link>
  );
}
