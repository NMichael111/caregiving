import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const { signIn, signOut, useSession } = authClient;

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "CAREGIVER";
};
