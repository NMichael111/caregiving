import type { Response } from "express";

interface SseEvent {
  event?: string;
  data: unknown;
}

/**
 * In-memory SSE hub. Maps userId → set of open Response objects (one per browser tab).
 * Fine for single-instance deploy on the Oracle VM. For multi-instance, swap for Redis pub/sub.
 */
class SseHub {
  private subs = new Map<string, Set<Response>>();

  add(userId: string, res: Response) {
    const set = this.subs.get(userId) ?? new Set();
    set.add(res);
    this.subs.set(userId, set);
  }

  remove(userId: string, res: Response) {
    const set = this.subs.get(userId);
    if (!set) return;
    set.delete(res);
    if (set.size === 0) this.subs.delete(userId);
  }

  publish(userIds: string[], event: SseEvent) {
    const lines: string[] = [];
    if (event.event) lines.push(`event: ${event.event}`);
    lines.push(`data: ${JSON.stringify(event.data)}`);
    const payload = lines.join("\n") + "\n\n";
    const seen = new Set<Response>();
    for (const uid of userIds) {
      const set = this.subs.get(uid);
      if (!set) continue;
      for (const res of set) {
        if (seen.has(res)) continue;
        seen.add(res);
        try {
          res.write(payload);
        } catch {
          // dropped; close handler will clean up
        }
      }
    }
  }
}

export const sse = new SseHub();
