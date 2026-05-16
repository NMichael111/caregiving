import { fetchJson } from "../lib/api";

export interface TimesheetRow {
  shiftId: string;
  caregiverId: string;
  caregiverName: string;
  clientName: string;
  scheduledStart: string;
  scheduledEnd: string;
  clockInAt: string | null;
  clockOutAt: string | null;
  hoursWorked: number;
  geofenceFlag: boolean;
}

export interface TimesheetResult {
  rows: TimesheetRow[];
  totalHours: number;
}

export async function getTimesheets(params: {
  caregiverId?: string;
  from?: string;
  to?: string;
}): Promise<TimesheetResult> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
  return fetchJson<TimesheetResult>(`/api/timesheets${qs.toString() ? `?${qs}` : ""}`);
}

export function timesheetExportUrl(params: {
  caregiverId?: string;
  from?: string;
  to?: string;
}): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
  return `/api/timesheets/export${qs.toString() ? `?${qs}` : ""}`;
}
