import { useCallback, useEffect, useRef, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { Button } from "../components/Button";
import {
  listMessages,
  listThreads,
  sendMessage,
  type Message,
  type Thread,
} from "../api/messages";
import { useMessageStream } from "../lib/sse";
import { useSession } from "../lib/auth";
import { formatTime, formatDateShort, isSameDay } from "../lib/dates";

const PAGE_SIZE = 50;

export default function Messages() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const me = session?.user as unknown as { id: string; name: string } | undefined;

  const { data: threads = [] } = useQuery({
    queryKey: ["threads"],
    queryFn: listThreads,
  });

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  useEffect(() => {
    if (!activeThreadId && threads.length > 0) setActiveThreadId(threads[0].id);
  }, [threads, activeThreadId]);

  // SSE: append incoming messages to the newest page (pages[0]) of whichever
  // thread they belong to. Also bump the threads list for last-message preview.
  const onMessage = useCallback(
    (data: { threadId: string; message: Message }) => {
      queryClient.setQueryData<InfiniteData<Message[]>>(
        ["messages", data.threadId],
        (old) => {
          if (!old) return undefined;
          const pages = old.pages.slice();
          const newest = pages[0] ?? [];
          if (newest.some((m) => m.id === data.message.id)) return old;
          pages[0] = [...newest, data.message];
          return { ...old, pages };
        },
      );
      queryClient.invalidateQueries({ queryKey: ["threads"] });
    },
    [queryClient],
  );
  useMessageStream(onMessage);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Messages</h1>
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden flex flex-col sm:flex-row min-h-[60vh]">
        <ThreadList
          threads={threads}
          activeId={activeThreadId}
          onSelect={setActiveThreadId}
          meId={me?.id}
        />
        <div className="flex-1 flex flex-col border-t sm:border-t-0 sm:border-l border-slate-200">
          {activeThreadId ? (
            <ThreadView threadId={activeThreadId} meId={me?.id} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              No threads yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ThreadList({
  threads,
  activeId,
  onSelect,
  meId,
}: {
  threads: Thread[];
  activeId: string | null;
  onSelect: (id: string) => void;
  meId: string | undefined;
}) {
  return (
    <div className="sm:w-64 sm:max-w-xs flex-shrink-0 divide-y divide-slate-100 sm:max-h-[70vh] overflow-y-auto">
      {threads.length === 0 && (
        <div className="p-4 text-sm text-slate-400">No conversations.</div>
      )}
      {threads.map((t) => {
        const isActive = t.id === activeId;
        const preview = t.lastMessage?.sender
          ? `${t.lastMessage.sender.id === meId ? "You: " : ""}${t.lastMessage.body}`
          : t.lastMessage
            ? t.lastMessage.body
            : "No messages yet";
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            className={`block w-full text-left px-3 py-2 ${isActive ? "bg-brand-50" : "hover:bg-slate-50"}`}
          >
            <div className="font-medium text-sm truncate">{t.displayName}</div>
            <div className="text-xs text-slate-500 truncate">{preview}</div>
          </button>
        );
      })}
    </div>
  );
}

function ThreadView({ threadId, meId }: { threadId: string; meId: string | undefined }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["messages", threadId],
    queryFn: ({ pageParam }) =>
      listMessages(threadId, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    // getNextPageParam returns the cursor for the NEXT (older) page.
    // Pages from the API are oldest-first within the page; the oldest of the
    // currently-loaded older-most page is the cursor for the next older fetch.
    getNextPageParam: (lastPage) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return lastPage[0]?.createdAt;
    },
  });

  // Flatten: API pages were fetched newest-batch-first, so reverse the page
  // array to display oldest → newest top-to-bottom.
  const messages = data ? data.pages.slice().reverse().flat() : [];

  // Scroll-to-bottom only when the LAST message changes (new send / SSE
  // arrival). Prepending older history doesn't move the last message, so it
  // won't trigger this and the user's scroll position is preserved naturally.
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.id === lastMessageIdRef.current) return;
    lastMessageIdRef.current = last.id;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // Reset scroll tracking when switching threads
  useEffect(() => {
    lastMessageIdRef.current = null;
  }, [threadId]);

  const sendMutation = useMutation({
    mutationFn: () => sendMessage(threadId, draft.trim()),
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["threads"] });
    },
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    sendMutation.mutate();
  }

  return (
    <>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[60vh] min-h-[300px]"
      >
        {hasNextPage && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="text-xs text-slate-500 hover:text-slate-700 underline disabled:opacity-50"
            >
              {isFetchingNextPage ? "Loading…" : "Load older messages"}
            </button>
          </div>
        )}
        {isLoading && <div className="text-slate-400 text-sm">Loading…</div>}
        {messages.length === 0 && !isLoading && (
          <div className="text-slate-400 text-sm italic">No messages yet — say hi.</div>
        )}
        {messages.map((m, i) => {
          const mine = m.sender.id === meId;
          const prev = messages[i - 1];
          const showDate =
            !prev || !isSameDay(new Date(prev.createdAt), new Date(m.createdAt));
          return (
            <div key={m.id}>
              {showDate && (
                <div className="text-center text-xs text-slate-400 my-2">
                  {formatDateShort(m.createdAt)}
                </div>
              )}
              <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                    mine ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-900"
                  }`}
                >
                  {!mine && <div className="text-xs font-medium mb-0.5">{m.sender.name}</div>}
                  <div className="whitespace-pre-wrap">{m.body}</div>
                  <div className={`text-[10px] mt-0.5 ${mine ? "text-brand-100" : "text-slate-500"}`}>
                    {formatTime(m.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <form
        onSubmit={onSubmit}
        className="border-t border-slate-200 p-3 flex gap-2"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <Button type="submit" disabled={sendMutation.isPending || !draft.trim()}>
          Send
        </Button>
      </form>
    </>
  );
}
