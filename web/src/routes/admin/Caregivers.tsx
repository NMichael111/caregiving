import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { Modal } from "../../components/Modal";
import { createCaregiver, listCaregivers, type CreatedCaregiver } from "../../api/caregivers";

export default function AdminCaregivers() {
  const [modalOpen, setModalOpen] = useState(false);
  const { data: caregivers = [], isLoading } = useQuery({
    queryKey: ["caregivers"],
    queryFn: listCaregivers,
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Caregivers</h1>
        <Button onClick={() => setModalOpen(true)}>+ New caregiver</Button>
      </div>

      {isLoading && <div className="text-slate-400">Loading…</div>}

      <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
        {caregivers.length === 0 && !isLoading && (
          <div className="p-6 text-center text-slate-500 text-sm">No caregivers yet.</div>
        )}
        {caregivers.map((c) => (
          <Link
            key={c.id}
            to={`/admin/caregivers/${c.id}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
          >
            <div>
              <div className="font-medium">{c.name}</div>
              <div className="text-sm text-slate-500">{c.email}</div>
            </div>
            <div className="text-sm text-slate-600">
              <span className="font-medium">{c.weeklyHours?.toFixed(1) ?? "0.0"}</span>{" "}
              <span className="text-slate-400">hrs / 7d</span>
            </div>
          </Link>
        ))}
      </div>

      <NewCaregiverModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}

function NewCaregiverModal({ open, onOpenChange }: { open: boolean; onOpenChange: (b: boolean) => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [created, setCreated] = useState<CreatedCaregiver | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => createCaregiver({ name, email }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["caregivers"] });
      setCreated(data);
    },
    onError: (err: Error & { body?: { error?: string } }) => {
      if (err.body?.error === "email_taken") {
        setError("That email is already in use.");
      } else {
        setError(err.message);
      }
    },
  });

  function reset() {
    setName("");
    setEmail("");
    setCreated(null);
    setError(null);
  }

  function handleClose(b: boolean) {
    if (!b) reset();
    onOpenChange(b);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    mutation.mutate();
  }

  return (
    <Modal open={open} onOpenChange={handleClose} title={created ? "Account created" : "New caregiver"}>
      {created ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Account for <strong>{created.name}</strong> ({created.email}) created.
          </p>
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
            <p className="text-sm font-medium text-amber-900">Temporary password</p>
            <p className="font-mono text-lg mt-1 select-all">{created.tempPassword}</p>
            <p className="text-xs text-amber-700 mt-2">
              This is shown <strong>once</strong>. Copy it and share with the caregiver out-of-band
              (text/call). You won't see it again.
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => handleClose(false)}>Done</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
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
              {mutation.isPending ? "Creating…" : "Create"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
