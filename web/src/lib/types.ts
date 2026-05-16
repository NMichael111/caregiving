export type Role = "ADMIN" | "CAREGIVER";

export type ShiftStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "MISSED";

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface Client {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  notes: string | null;
}

export interface ShiftTask {
  id: string;
  description: string;
  completed: boolean;
  completedAt: string | null;
  orderIdx: number;
}

export interface Shift {
  id: string;
  caregiverId: string;
  clientId: string;
  caregiver?: { id: string; name: string };
  client?: Client;
  scheduledStart: string;
  scheduledEnd: string;
  status: ShiftStatus;
  clockInAt: string | null;
  clockInLat: number | null;
  clockInLng: number | null;
  clockOutAt: string | null;
  clockOutLat: number | null;
  clockOutLng: number | null;
  signedByName: string | null;
  signedAt: string | null;
  caregiverNotes: string | null;
  geofenceFlag: boolean;
  signaturePng: string | null; // base64 dataURL from API
  tasks: ShiftTask[];
}
