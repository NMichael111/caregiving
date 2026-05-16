import { useEffect, useRef } from "react";

interface MessageEvent {
  threadId: string;
  message: {
    id: string;
    threadId: string;
    senderId: string;
    body: string;
    createdAt: string;
    sender: { id: string; name: string };
  };
}

export function useMessageStream(onMessage: (data: MessageEvent) => void) {
  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  });

  useEffect(() => {
    const es = new EventSource("/api/messages/stream", { withCredentials: true });
    const handler = (e: MessageEvent_) => {
      try {
        const data = JSON.parse(e.data) as MessageEvent;
        onMessageRef.current(data);
      } catch (err) {
        console.warn("[sse] parse error", err);
      }
    };
    es.addEventListener("message", handler as unknown as EventListener);
    return () => {
      es.removeEventListener("message", handler as unknown as EventListener);
      es.close();
    };
  }, []);
}

// Alias the DOM type to avoid colliding with our exported interface name.
type MessageEvent_ = globalThis.MessageEvent;
