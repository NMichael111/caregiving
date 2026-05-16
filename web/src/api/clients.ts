import { fetchJson } from "../lib/api";
import type { Client, Shift } from "../lib/types";

export type ClientWithShifts = Client & {
  shifts: (Shift & { caregiver: { id: string; name: string } })[];
};

export async function listClients(): Promise<Client[]> {
  return fetchJson<Client[]>("/api/clients");
}

export async function getClient(id: string): Promise<ClientWithShifts> {
  return fetchJson<ClientWithShifts>(`/api/clients/${id}`);
}

export interface CreateClientInput {
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  notes?: string | null;
}

export async function createClient(input: CreateClientInput): Promise<Client> {
  return fetchJson<Client>("/api/clients", { method: "POST", body: input });
}

export async function updateClient(
  id: string,
  input: Partial<CreateClientInput>,
): Promise<Client> {
  return fetchJson<Client>(`/api/clients/${id}`, { method: "PATCH", body: input });
}
