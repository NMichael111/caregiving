import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "../../components/Button";
import { Input, Textarea } from "../../components/Input";
import { Modal } from "../../components/Modal";
import { createClient, listClients } from "../../api/clients";

export default function AdminClients() {
  const [modalOpen, setModalOpen] = useState(false);
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: listClients,
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <Button onClick={() => setModalOpen(true)}>+ New client</Button>
      </div>

      {isLoading && <div className="text-slate-400">Loading…</div>}

      <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
        {clients.length === 0 && !isLoading && (
          <div className="p-6 text-center text-slate-500 text-sm">No clients yet.</div>
        )}
        {clients.map((c) => (
          <Link
            key={c.id}
            to={`/admin/clients/${c.id}`}
            className="block px-4 py-3 hover:bg-slate-50"
          >
            <div className="font-medium">{c.name}</div>
            <div className="text-sm text-slate-500">{c.address}</div>
          </Link>
        ))}
      </div>

      <NewClientModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}

function NewClientModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [showOverride, setShowOverride] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      createClient({
        name,
        address,
        notes: notes || null,
        lat: lat ? parseFloat(lat) : undefined,
        lng: lng ? parseFloat(lng) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      reset();
      onOpenChange(false);
    },
    onError: (err: Error & { body?: { error?: string } }) => {
      if (err.body?.error === "geocode_failed") {
        setShowOverride(true);
        setError("Could not look up that address. Enter lat/lng manually below.");
      } else {
        setError(err.message);
      }
    },
  });

  function reset() {
    setName("");
    setAddress("");
    setNotes("");
    setLat("");
    setLng("");
    setShowOverride(false);
    setError(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    mutation.mutate();
  }

  return (
    <Modal open={open} onOpenChange={(b) => { if (!b) reset(); onOpenChange(b); }} title="New client">
      <form onSubmit={onSubmit} className="space-y-3">
        <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input
          label="Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          hint="Used to geocode for EVV clock-in checks"
          required
        />
        <Textarea
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Special instructions, care preferences, etc."
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
            {mutation.isPending ? "Saving…" : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
