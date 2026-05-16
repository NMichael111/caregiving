import { z } from "zod";

export const createClientSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().min(1).max(500),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  notes: z.string().max(2000).nullish(),
});

export const updateClientSchema = createClientSchema.partial();

export const createCaregiverSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
});

export const updateCaregiverSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().max(200).optional(),
});

export const taskInputSchema = z.object({
  description: z.string().min(1).max(500),
});

export const createShiftSchema = z.object({
  caregiverId: z.string().min(1),
  clientId: z.string().min(1),
  scheduledStart: z.string().datetime(),
  scheduledEnd: z.string().datetime(),
  tasks: z.array(taskInputSchema).default([]),
});

export const updateShiftSchema = z.object({
  caregiverId: z.string().min(1).optional(),
  clientId: z.string().min(1).optional(),
  scheduledStart: z.string().datetime().optional(),
  scheduledEnd: z.string().datetime().optional(),
  tasks: z.array(taskInputSchema).optional(),
});

export const clockInSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const clockOutSchema = clockInSchema;

export const completeShiftSchema = z.object({
  tasks: z.array(z.object({ id: z.string(), completed: z.boolean() })),
  signaturePngBase64: z.string().min(1),
  signedByName: z.string().min(1).max(200),
  caregiverNotes: z.string().max(5000).nullish(),
});

export const createThreadSchema = z.object({
  name: z.string().max(200).nullish(),
  memberIds: z.array(z.string()).min(1),
});

export const sendMessageSchema = z.object({
  body: z.string().min(1).max(5000),
});
