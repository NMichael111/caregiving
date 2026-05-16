export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
  }
}

type FetchOpts = Omit<RequestInit, "body"> & { body?: unknown };

export async function fetchJson<T = unknown>(path: string, opts: FetchOpts = {}): Promise<T> {
  const { body, headers, ...rest } = opts;
  const res = await fetch(path, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...rest,
  });

  if (!res.ok) {
    let errorBody: unknown;
    try {
      errorBody = await res.json();
    } catch {
      errorBody = await res.text().catch(() => "");
    }
    const msg =
      (errorBody as { error?: string; message?: string })?.error ??
      (errorBody as { message?: string })?.message ??
      `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, errorBody);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}
