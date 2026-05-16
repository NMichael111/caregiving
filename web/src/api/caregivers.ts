import { fetchJson } from "../lib/api";
import type { Shift } from "../lib/types";

export interface Caregiver {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  weeklyHours?: number;
}

export type CaregiverWithShifts = Omit<Caregiver, "weeklyHours"> & {
  shifts: (Shift & { client: { id: string; name: string } })[];
};

export interface CreatedCaregiver extends Caregiver {
  tempPassword: string;
}

export async function listCaregivers(): Promise<Caregiver[]> {
  return fetchJson<Caregiver[]>("/api/caregivers");
}

export async function getCaregiver(id: string): Promise<CaregiverWithShifts> {
  return fetchJson<CaregiverWithShifts>(`/api/caregivers/${id}`);
}

export async function createCaregiver(input: {
  name: string;
  email: string;
}): Promise<CreatedCaregiver> {
  return fetchJson<CreatedCaregiver>("/api/caregivers", { method: "POST", body: input });
}

export async function updateCaregiver(
  id: string,
  input: { name?: string; email?: string },
): Promise<Caregiver> {
  return fetchJson<Caregiver>(`/api/caregivers/${id}`, { method: "PATCH", body: input });
}
