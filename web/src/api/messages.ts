import { fetchJson } from "../lib/api";

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  createdAt: string;
  sender: { id: string; name: string };
}

export interface ThreadMember {
  id: string;
  name: string;
  role?: "ADMIN" | "CAREGIVER";
}

export interface Thread {
  id: string;
  name: string | null;
  displayName: string;
  createdAt: string;
  members: ThreadMember[];
  lastMessage: Message | null;
}

export async function listThreads(): Promise<Thread[]> {
  return fetchJson<Thread[]>("/api/threads");
}

export async function listMessages(threadId: string, before?: string): Promise<Message[]> {
  const qs = before ? `?before=${encodeURIComponent(before)}` : "";
  return fetchJson<Message[]>(`/api/threads/${threadId}/messages${qs}`);
}

export async function sendMessage(threadId: string, body: string): Promise<Message> {
  return fetchJson<Message>(`/api/threads/${threadId}/messages`, {
    method: "POST",
    body: { body },
  });
}

export async function createThread(memberIds: string[], name?: string): Promise<Thread> {
  return fetchJson<Thread>("/api/threads", {
    method: "POST",
    body: { memberIds, name },
  });
}
