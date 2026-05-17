import type {
  ConsoleSessionState,
  EffectKind,
  RevealActionResponse,
  SessionCreateResponse
} from "@openreveal/shared";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export function getAuthSession() {
  return request<{ authenticated: boolean }>("/api/auth/session");
}

export function login(passphrase: string) {
  return request<{ ok: true }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ passphrase })
  });
}

export function logout() {
  return request<{ ok: true }>("/api/auth/logout", {
    method: "POST"
  });
}

export function createSession() {
  return request<SessionCreateResponse>("/api/sessions", {
    method: "POST"
  });
}

export function getSession(sessionCode: string) {
  return request<ConsoleSessionState>(`/api/sessions/${sessionCode}`);
}

export function endSession(sessionCode: string) {
  return request<{ ok: true }>(`/api/sessions/${sessionCode}/end`, {
    method: "POST"
  });
}

export function resetSession(sessionCode: string) {
  return request<{ ok: true }>(`/api/sessions/${sessionCode}/reset`, {
    method: "POST"
  });
}

export function prepareReveal(sessionCode: string, kind: EffectKind, input: unknown) {
  return request<RevealActionResponse>(`/api/sessions/${sessionCode}/reveal/prepare`, {
    method: "POST",
    body: JSON.stringify({ kind, input })
  });
}

export function sendReveal(sessionCode: string) {
  return request<RevealActionResponse>(`/api/sessions/${sessionCode}/reveal/send`, {
    method: "POST"
  });
}

export function getReceiverStatus(sessionCode: string, deviceId?: string) {
  const params = new URLSearchParams();
  if (deviceId) params.set("deviceId", deviceId);
  const suffix = params.size ? `?${params.toString()}` : "";
  return request<{ status: "live" | "expired" | "in_use" }>(
    `/api/receiver/${sessionCode}${suffix}`
  );
}
