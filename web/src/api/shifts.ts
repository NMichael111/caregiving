import { fetchJson, ApiError } from "../lib/api";
import type { Shift } from "../lib/types";

export interface ConflictShift {
  id: string;
  scheduledStart: string;
  scheduledEnd: string;
  client: { id: string; name: string };
}

export interface CreateShiftInput {
  caregiverId: string;
  clientId: string;
  scheduledStart: string; // ISO
  scheduledEnd: string;
  tasks: { description: string }[];
}

export type UpdateShiftInput = Partial<CreateShiftInput>;

export async function listShifts(params: {
  from?: string;
  to?: string;
  caregiverId?: string;
  clientId?: string;
} = {}): Promise<Shift[]> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
  return fetchJson<Shift[]>(`/api/shifts${qs.toString() ? `?${qs}` : ""}`);
}

export async function getShift(id: string): Promise<Shift> {
  return fetchJson<Shift>(`/api/shifts/${id}`);
}

export async function createShift(
  input: CreateShiftInput,
  force = false,
): Promise<Shift> {
  return fetchJson<Shift>(`/api/shifts${force ? "?force=true" : ""}`, {
    method: "POST",
    body: input,
  });
}

export async function updateShift(
  id: string,
  input: UpdateShiftInput,
  force = false,
): Promise<Shift> {
  return fetchJson<Shift>(`/api/shifts/${id}${force ? "?force=true" : ""}`, {
    method: "PATCH",
    body: input,
  });
}

export async function cancelShift(id: string): Promise<void> {
  return fetchJson(`/api/shifts/${id}`, { method: "DELETE" });
}

export async function clockIn(
  id: string,
  coords: { lat: number; lng: number },
): Promise<Shift> {
  return fetchJson<Shift>(`/api/shifts/${id}/clock-in`, { method: "POST", body: coords });
}

export async function clockOut(
  id: string,
  coords: { lat: number; lng: number },
): Promise<Shift> {
  return fetchJson<Shift>(`/api/shifts/${id}/clock-out`, { method: "POST", body: coords });
}

export async function completeShift(
  id: string,
  input: {
    tasks: { id: string; completed: boolean }[];
    signaturePngBase64: string;
    signedByName: string;
    caregiverNotes?: string | null;
  },
): Promise<Shift> {
  return fetchJson<Shift>(`/api/shifts/${id}/complete`, { method: "POST", body: input });
}

export function isConflictError(err: unknown): err is ApiError & {
  body: { error: "schedule_conflict"; conflicts: ConflictShift[] };
} {
  return (
    err instanceof ApiError &&
    err.status === 409 &&
    (err.body as { error?: string })?.error === "schedule_conflict"
  );
}
