import type { ConnectionState } from "@openreveal/shared";

export function formatConnectionState(state: ConnectionState) {
  switch (state) {
    case "foregrounded":
      return "Foregrounded";
    case "backgrounded":
      return "Backgrounded";
    case "connecting":
      return "Connecting";
    case "disconnected":
      return "Disconnected";
  }
}

export function websocketUrl(
  sessionCode: string,
  role: "performer" | "receiver",
  options: { deviceId?: string } = {}
) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const params = new URLSearchParams({ code: sessionCode, role });
  if (options.deviceId) params.set("deviceId", options.deviceId);
  return `${protocol}//${window.location.host}/ws?${params.toString()}`;
}
