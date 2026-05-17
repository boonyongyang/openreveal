import type { ConnectionState, RevealPayload, WsServerEvent } from "@openreveal/shared";
import { WebSocket } from "ws";

interface ReceiverConnection {
  deviceId: string;
  socket: WebSocket;
  ua: string;
  state: Exclude<ConnectionState, "disconnected" | "connecting">;
  lastSeenAt: string;
}

interface LiveSession {
  seq: number;
  performers: Set<WebSocket>;
  receiver?: ReceiverConnection;
}

export class RealtimeHub {
  private readonly sessions = new Map<string, LiveSession>();

  ensure(sessionCode: string) {
    let session = this.sessions.get(sessionCode);
    if (!session) {
      session = { seq: 0, performers: new Set() };
      this.sessions.set(sessionCode, session);
    }
    return session;
  }

  getConnectionState(sessionCode: string): ConnectionState {
    const receiver = this.sessions.get(sessionCode)?.receiver;
    return receiver?.state ?? "disconnected";
  }

  getReceiver(sessionCode: string) {
    return this.sessions.get(sessionCode)?.receiver;
  }

  hasReceiver(sessionCode: string) {
    return Boolean(this.sessions.get(sessionCode)?.receiver);
  }

  canAcceptReceiver(sessionCode: string, deviceId: string) {
    const receiver = this.sessions.get(sessionCode)?.receiver;
    return !receiver || receiver.deviceId === deviceId;
  }

  joinPerformer(sessionCode: string, socket: WebSocket) {
    const session = this.ensure(sessionCode);
    session.performers.add(socket);
    this.send(socket, sessionCode, {
      type: "session_state",
      data: {
        status: "live",
        connectionState: this.getConnectionState(sessionCode)
      }
    });
    this.broadcastPerformers(sessionCode, {
      type: "performer.joined",
      data: {}
    });
  }

  leavePerformer(sessionCode: string, socket: WebSocket) {
    this.sessions.get(sessionCode)?.performers.delete(socket);
  }

  joinReceiver(sessionCode: string, receiver: ReceiverConnection) {
    const session = this.ensure(sessionCode);
    const previousReceiver = session.receiver;
    if (previousReceiver && previousReceiver.deviceId === receiver.deviceId) {
      previousReceiver.socket.close(1000, "receiver replaced");
      this.broadcastPerformers(sessionCode, {
        type: "receiver.left",
        data: { deviceId: previousReceiver.deviceId, reason: "replaced" }
      });
    }
    session.receiver = receiver;
    this.send(receiver.socket, sessionCode, {
      type: "session_state",
      data: {
        status: "live",
        connectionState: receiver.state
      }
    });
    this.broadcastPerformers(sessionCode, {
      type: "receiver.joined",
      data: { deviceId: receiver.deviceId, ua: receiver.ua }
    });
    this.broadcastPerformers(sessionCode, {
      type: "connection_state_changed",
      data: { state: receiver.state }
    });
  }

  prepareReveal(sessionCode: string, reveal: { revealId: string; kind: string; payload: RevealPayload }) {
    const receiverEvent: WsServerEvent = {
      type: "reveal_prepared",
      data: reveal
    };
    const performerEvent: WsServerEvent = {
      type: "reveal_prepared",
      data: {
        revealId: reveal.revealId,
        kind: reveal.kind
      }
    };
    const session = this.sessions.get(sessionCode);
    if (session?.receiver) this.send(session.receiver.socket, sessionCode, receiverEvent);
    this.broadcastPerformers(sessionCode, performerEvent);
  }

  sendReveal(sessionCode: string, revealId: string) {
    const event: WsServerEvent = {
      type: "reveal_sent",
      data: { revealId }
    };
    const session = this.sessions.get(sessionCode);
    if (session?.receiver) this.send(session.receiver.socket, sessionCode, event);
    this.broadcastPerformers(sessionCode, event);
  }

  restoreReveal(
    sessionCode: string,
    reveal: { revealId: string; kind: string; payload: RevealPayload; sent: boolean }
  ) {
    const session = this.sessions.get(sessionCode);
    if (!session?.receiver) return;

    this.send(session.receiver.socket, sessionCode, {
      type: "reveal_prepared",
      data: {
        revealId: reveal.revealId,
        kind: reveal.kind,
        payload: reveal.payload
      }
    });

    if (reveal.sent) {
      this.send(session.receiver.socket, sessionCode, {
        type: "reveal_sent",
        data: { revealId: reveal.revealId }
      });
    }
  }

  reset(sessionCode: string) {
    this.broadcastAll(sessionCode, {
      type: "session_reset",
      data: {}
    });
  }

  acknowledgePrepared(sessionCode: string, revealId: string) {
    this.broadcastPerformers(sessionCode, {
      type: "receiver.prepared_ack",
      data: { revealId }
    });
  }

  acknowledgeReveal(sessionCode: string, revealId: string, renderedAtMs: number, latencyMs?: number) {
    this.broadcastPerformers(sessionCode, {
      type: "receiver.reveal_ack",
      data: { revealId, renderedAtMs, latencyMs }
    });
  }

  rejectReceiver(sessionCode: string, socket: WebSocket) {
    this.send(socket, sessionCode, {
      type: "session_state",
      data: {
        status: "in_use",
        connectionState: this.getConnectionState(sessionCode)
      }
    });
    socket.close(1008, "session already has a receiver");
  }

  updateReceiverState(sessionCode: string, deviceId: string, state: "foregrounded" | "backgrounded") {
    const receiver = this.sessions.get(sessionCode)?.receiver;
    if (!receiver || receiver.deviceId !== deviceId) return;
    receiver.state = state;
    receiver.lastSeenAt = new Date().toISOString();
    this.broadcastPerformers(sessionCode, {
      type: "connection_state_changed",
      data: { state }
    });
  }

  leaveReceiver(
    sessionCode: string,
    deviceId: string,
    reason: "closed" | "timeout" | "replaced",
    socket?: WebSocket
  ) {
    const session = this.sessions.get(sessionCode);
    if (!session?.receiver || session.receiver.deviceId !== deviceId) return;
    if (socket && session.receiver.socket !== socket) return;
    session.receiver = undefined;
    this.broadcastPerformers(sessionCode, {
      type: "receiver.left",
      data: { deviceId, reason }
    });
    this.broadcastPerformers(sessionCode, {
      type: "connection_state_changed",
      data: { state: "disconnected" }
    });
  }

  expire(sessionCode: string, reason: "ttl" | "ended_by_performer" | "admin") {
    const session = this.ensure(sessionCode);
    this.broadcastAll(sessionCode, {
      type: "session_expired",
      data: { reason }
    });
    for (const socket of [...session.performers]) socket.close(1000, "session expired");
    session.receiver?.socket.close(1000, "session expired");
    this.sessions.delete(sessionCode);
  }

  private broadcastAll(sessionCode: string, event: WsServerEvent) {
    const session = this.sessions.get(sessionCode);
    if (!session) return;
    for (const socket of session.performers) this.send(socket, sessionCode, event);
    if (session.receiver) this.send(session.receiver.socket, sessionCode, event);
  }

  private broadcastPerformers(sessionCode: string, event: WsServerEvent) {
    const session = this.sessions.get(sessionCode);
    if (!session) return;
    for (const socket of session.performers) this.send(socket, sessionCode, event);
  }

  private send(socket: WebSocket, sessionCode: string, event: WsServerEvent) {
    if (socket.readyState !== WebSocket.OPEN) return;
    const session = this.ensure(sessionCode);
    session.seq += 1;
    socket.send(
      JSON.stringify({
        v: 1,
        seq: session.seq,
        ts: Date.now(),
        sessionCode,
        type: event.type,
        data: event.data
      })
    );
  }
}
