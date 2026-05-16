import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../components/Modal";
import { Button } from "../../components/Button";
import { Input, Select } from "../../components/Input";
import { listCaregivers } from "../../api/caregivers";
import { listClients } from "../../api/clients";
import {
  createShift,
  updateShift,
  cancelShift,
  isConflictError,
  type ConflictShift,
} from "../../api/shifts";
import type { Shift } from "../../lib/types";
import { toLocalDatetimeInput, formatTime, formatDateShort } from "../../lib/dates";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift?: Shift | null;
  defaultDate?: Date;
}

interface TaskRow {
  description: string;
}

export function ShiftFormModal({ open, onOpenChange, shift, defaultDate }: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!shift;

  const { data: caregivers = [] } = useQuery({
    queryKey: ["caregivers"],
    queryFn: listCaregivers,
    enabled: open,
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: listClients,
    enabled: open,
  });

  const [caregiverId, setCaregiverId] = useState("");
  const [clientId, setClientId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [tasks, setTasks] = useState<TaskRow[]>([{ description: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<ConflictShift[] | null>(null);

  useEffect(() => {
    if (!open) return;
    if (shift) {
      setCaregiverId(shift.caregiverId);
      setClientId(shift.clientId);
      setStart(toLocalDatetimeInput(new Date(shift.scheduledStart)));
      setEnd(toLocalDatetimeInput(new Date(shift.scheduledEnd)));
      setTasks(
        shift.tasks.length > 0
          ? shift.tasks.map((t) => ({ description: t.description }))
          : [{ description: "" }],
      );
    } else {
      const base = defaultDate ?? new Date();
      const startD = new Date(base);
      startD.setHours(9, 0, 0, 0);
      const endD = new Date(base);
      endD.setHours(12, 0, 0, 0);
      setCaregiverId("");
      setClientId("");
      setStart(toLocalDatetimeInput(startD));
      setEnd(toLocalDatetimeInput(endD));
      setTasks([{ description: "" }]);
    }
    setError(null);
    setConflicts(null);
  }, [open, shift, defaultDate]);

  const saveMutation = useMutation({
    mutationFn: async (force: boolean) => {
      const body = {
        caregiverId,
        clientId,
        scheduledStart: new Date(start).toISOString(),
        scheduledEnd: new Date(end).toISOString(),
        tasks: tasks.filter((t) => t.description.trim()).map((t) => ({ description: t.description.trim() })),
      };
      if (isEdit && shift) return updateShift(shift.id, body, force);
      return createShift(body, force);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      onOpenChange(false);
    },
    onError: (err) => {
      if (isConflictError(err)) {
        setConflicts(err.body.conflicts);
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : "Failed to save shift");
      }
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelShift(shift!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      onOpenChange(false);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Failed to cancel"),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!caregiverId || !clientId) {
      setError("Pick both a caregiver and a client");
      return;
    }
    if (new Date(end) <= new Date(start)) {
      setError("End time must be after start time");
      return;
    }
    setError(null);
    setConflicts(null);
    saveMutation.mutate(false);
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit shift" : "New shift"}
      size="lg"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Caregiver"
            value={caregiverId}
            onChange={(e) => setCaregiverId(e.target.value)}
            required
          >
            <option value="">Select caregiver…</option>
            {caregivers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            label="Client"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
          >
            <option value="">Select client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Start"
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            required
          />
          <Input
            label="End"
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            required
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-700">Tasks</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setTasks([...tasks, { description: "" }])}
            >
              + Add task
            </Button>
          </div>
          <div className="space-y-2">
            {tasks.map((t, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  className="flex-1"
                  placeholder="e.g. Bathing assistance"
                  value={t.description}
                  onChange={(e) => {
                    const next = [...tasks];
                    next[i] = { description: e.target.value };
                    setTasks(next);
                  }}
                />
                {tasks.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setTasks(tasks.filter((_, idx) => idx !== i))}
                  >
                    ×
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {conflicts && (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm">
            <p className="font-medium text-amber-900">Schedule conflict</p>
            <p className="text-amber-700 mt-1 mb-2">
              This caregiver is already booked during the selected time:
            </p>
            <ul className="text-amber-800 text-sm list-disc list-inside space-y-0.5">
              {conflicts.map((c) => (
                <li key={c.id}>
                  {formatDateShort(c.scheduledStart)} {formatTime(c.scheduledStart)}–
                  {formatTime(c.scheduledEnd)} with {c.client.name}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => saveMutation.mutate(true)}
                disabled={saveMutation.isPending}
              >
                Schedule anyway
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConflicts(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-between pt-2 border-t border-slate-100">
          <div className="flex gap-2">
            {isEdit && shift && shift.status !== "COMPLETED" && (
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  if (confirm("Cancel this shift?")) cancelMutation.mutate();
                }}
                disabled={cancelMutation.isPending}
              >
                Cancel shift
              </Button>
            )}
            {isEdit && shift && (
              <a href={`/admin/shifts/${shift.id}`}>
                <Button type="button" variant="ghost">
                  View details
                </Button>
              </a>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button type="submit" disabled={saveMutation.isPending || !!conflicts}>
              {saveMutation.isPending ? "Saving…" : isEdit ? "Save" : "Create"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
