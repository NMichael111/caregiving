import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import SignatureCanvas from "react-signature-canvas";
import { Modal } from "../../components/Modal";
import { Button } from "../../components/Button";
import { Input, Textarea } from "../../components/Input";
import { completeShift } from "../../api/shifts";
import type { Shift } from "../../lib/types";

interface Props {
  shift: Shift;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompleteShiftFlow({ shift, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const sigRef = useRef<SignatureCanvas | null>(null);
  const [taskState, setTaskState] = useState<Record<string, boolean>>({});
  const [signedByName, setSignedByName] = useState("");
  const [notes, setNotes] = useState("");
  const [sigEmpty, setSigEmpty] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // Initialize: pre-check tasks that the caregiver already marked done earlier
    const init: Record<string, boolean> = {};
    for (const t of shift.tasks) init[t.id] = t.completed;
    setTaskState(init);
    setSignedByName(shift.client?.name ?? "");
    setNotes(shift.caregiverNotes ?? "");
    setError(null);
    setSigEmpty(true);
    // Defer to give modal time to mount
    setTimeout(() => sigRef.current?.clear(), 50);
  }, [open, shift]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!sigRef.current || sigRef.current.isEmpty()) {
        throw new Error("Please capture a signature.");
      }
      if (!signedByName.trim()) {
        throw new Error("Please enter the client's name.");
      }
      const dataUrl = sigRef.current.toDataURL("image/png");
      const tasks = Object.entries(taskState).map(([id, completed]) => ({ id, completed }));
      return completeShift(shift.id, {
        tasks,
        signaturePngBase64: dataUrl,
        signedByName: signedByName.trim(),
        caregiverNotes: notes.trim() || null,
      });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["shift", shift.id], updated);
      queryClient.invalidateQueries({ queryKey: ["my-shifts"] });
      onOpenChange(false);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Failed to submit"),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    mutation.mutate();
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Complete shift"
      description="Confirm tasks performed and capture client signature"
      size="lg"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {shift.tasks.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-2">Tasks</h3>
            <ul className="space-y-1.5">
              {shift.tasks.map((t) => (
                <li key={t.id}>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={taskState[t.id] ?? false}
                      onChange={(e) =>
                        setTaskState({ ...taskState, [t.id]: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className={taskState[t.id] ? "line-through text-slate-500" : ""}>
                      {t.description}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Textarea
          label="Caregiver notes (optional)"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything the office should know about this visit?"
        />

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-sm font-medium text-slate-700">Client signature</span>
            <button
              type="button"
              onClick={() => {
                sigRef.current?.clear();
                setSigEmpty(true);
              }}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Clear
            </button>
          </div>
          <div className="rounded-md border border-slate-300 bg-white overflow-hidden">
            <SignatureCanvas
              ref={(r) => {
                sigRef.current = r;
              }}
              penColor="black"
              backgroundColor="white"
              canvasProps={{
                className: "w-full h-40 touch-none",
              }}
              onBegin={() => setSigEmpty(false)}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Hand the device to {shift.client?.name ?? "the client"} to sign.
          </p>
        </div>

        <Input
          label="Signed by (typed name)"
          value={signedByName}
          onChange={(e) => setSignedByName(e.target.value)}
          required
        />

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending || sigEmpty}>
            {mutation.isPending ? "Submitting…" : "Submit shift"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
