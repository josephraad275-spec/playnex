import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { pathToFileURL } from "node:url";
import { WebSocketServer, WebSocket } from "ws";
import {
  initialState,
  applyMove,
  publicState,
  type GameId,
} from "../../../packages/games/src/index.js";

type Session = { id: string; name: string; expires: number };
type Member = { id: string; name: string; ready: boolean };
type Room = {
  id: string;
  invite: string;
  gameId: GameId;
  members: Member[];
  status: "waiting" | "playing" | "finished";
  state: ReturnType<typeof initialState>;
  expires: number;
  rematch: Set<string>;
  version: number;
};
const games = new Set(["tic-tac-toe", "four-in-a-row", "quick-trivia"]);
const token = () => randomBytes(32).toString("base64url");
class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const fail = (status: number, message: string): never => {
  throw new ApiError(status, message);
};

/** Single-process beta authority. Never run multiple replicas with this memory store. */
export function createApp(
  options: { roomTtlMs?: number; rateLimit?: number } = {},
) {
  const sessions = new Map<string, Session>();
  const rooms = new Map<string, Room>();
  const limits = new Map<string, { count: number; reset: number }>();
  const sockets = new Map<WebSocket, { room: string; id: string }>();
  const alive = new WeakSet<WebSocket>();
  const roomTtl = options.roomTtlMs ?? 2 * 60 * 60 * 1000;
  const rateLimit = options.rateLimit ?? 180;
  function rate(key: string) {
    const now = Date.now();
    let entry = limits.get(key);
    if (!entry || entry.reset <= now) {
      entry = { count: 0, reset: now + 60000 };
      limits.set(key, entry);
    }
    if (++entry.count > rateLimit)
      fail(429, "Too many requests. Please wait a minute.");
  }
  function session(value: string | undefined) {
    const found = value && sessions.get(value);
    if (!found || found.expires <= Date.now())
      return fail(401, "Your guest session expired. Please join again.");
    return found;
  }
  function getRoom(id: string) {
    const room = rooms.get(id);
    if (!room || room.expires <= Date.now())
      return fail(410, "This room has expired. Create a new invitation.");
    return room;
  }
  function member(room: Room, id: string) {
    const index = room.members.findIndex((p) => p.id === id);
    if (index < 0) return fail(403, "You are not a member of this room.");
    return index as 0 | 1;
  }
  function snapshot(room: Room, id: string) {
    const index = member(room, id);
    return {
      id: room.id,
      gameId: room.gameId,
      status: room.status,
      hostId: room.members[0]?.id,
      playerIndex: index,
      members: room.members.map((p) => ({
        ...p,
        connected: [...sockets.values()].some(
          (s) => s.room === room.id && s.id === p.id,
        ),
      })),
      game: publicState(room.state, index),
      expiresAt: room.expires,
      version: room.version,
      rematchVotes: [...room.rematch],
      ...(index === 0 ? { invite: room.invite } : {}),
    };
  }
  function broadcast(room: Room) {
    for (const [socket, info] of sockets)
      if (info.room === room.id && socket.readyState === WebSocket.OPEN)
        socket.send(
          JSON.stringify({ type: "room", room: snapshot(room, info.id) }),
        );
  }
  async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
    if (!req.headers["content-type"]?.startsWith("application/json"))
      fail(415, "Send application/json.");
    let raw = "";
    for await (const chunk of req) {
      raw += chunk;
      if (Buffer.byteLength(raw) > 4096) fail(413, "Request is too large.");
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        fail(400, "Expected a JSON object.");
      return parsed as Record<string, unknown>;
    } catch {
      return fail(400, "Invalid JSON.");
    }
  }
  function json(res: ServerResponse, status: number, data: unknown) {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    });
    res.end(JSON.stringify(data));
  }
  const server = createServer(async (req, res) => {
    try {
      rate(`ip:${req.socket.remoteAddress}`);
      const url = new URL(req.url ?? "/", "http://localhost");
      if (req.method === "GET" && url.pathname === "/api/health")
        return json(res, 200, { ok: true, storage: "ephemeral" });
      if (req.method === "POST" && url.pathname === "/api/session") {
        const data = await body(req);
        const name = typeof data.name === "string" ? data.name.trim() : "";
        if (name.length < 2 || name.length > 24 || /[\p{C}<>]/u.test(name))
          fail(
            400,
            "Choose a name of 2–24 characters, without markup or control characters.",
          );
        if (data.ageConfirmed !== true)
          fail(
            400,
            "The private beta requires confirmation that you are at least 18.",
          );
        if (sessions.size >= 10000)
          fail(503, "The beta is at capacity. Please try later.");
        const guest = {
          id: randomUUID(),
          name,
          expires: Date.now() + 24 * 60 * 60 * 1000,
        };
        const key = token();
        sessions.set(key, guest);
        return json(res, 201, {
          token: key,
          player: { id: guest.id, name: guest.name },
          expiresAt: guest.expires,
        });
      }
      const guest = session(req.headers.authorization?.replace(/^Bearer /, ""));
      rate(`session:${guest.id}`);
      if (req.method === "DELETE" && url.pathname === "/api/session") {
        sessions.delete(req.headers.authorization!.slice(7));
        for (const [socket, info] of sockets)
          if (info.id === guest.id) socket.close(1000, "Session deleted");
        for (const room of rooms.values())
          if (room.members.some((p) => p.id === guest.id)) {
            rooms.delete(room.id);
            for (const [socket, info] of sockets)
              if (info.room === room.id)
                socket.close(1000, "Room closed after account deletion");
          }
        return json(res, 200, { deleted: true });
      }
      if (req.method === "GET" && url.pathname === "/api/session/export") {
        return json(res, 200, {
          player: { id: guest.id, name: guest.name },
          rooms: [...rooms.values()]
            .filter((r) => r.members.some((p) => p.id === guest.id))
            .map((r) => ({ id: r.id, gameId: r.gameId, status: r.status })),
        });
      }
      if (req.method === "POST" && url.pathname === "/api/rooms") {
        const data = await body(req);
        if (!games.has(String(data.gameId))) fail(400, "Unsupported game.");
        if (rooms.size >= 10000)
          fail(503, "The beta is at capacity. Please try later.");
        const owned = [...rooms.values()].filter(
          (r) => r.members[0]?.id === guest.id && r.expires > Date.now(),
        );
        if (owned.length >= 5)
          fail(429, "You can host at most five active rooms.");
        const gameId = data.gameId as GameId;
        const room: Room = {
          id: randomBytes(9).toString("base64url"),
          invite: token(),
          gameId,
          members: [{ id: guest.id, name: guest.name, ready: false }],
          status: "waiting",
          state: initialState(gameId),
          expires: Date.now() + roomTtl,
          rematch: new Set(),
          version: 0,
        };
        rooms.set(room.id, room);
        return json(res, 201, {
          room: snapshot(room, guest.id),
          invite: room.invite,
        });
      }
      const match = /^\/api\/rooms\/([A-Za-z0-9_-]+)(?:\/(join|action))?$/.exec(
        url.pathname,
      );
      if (!match) fail(404, "Endpoint not found.");
      const room = getRoom(match![1]!);
      if (req.method === "POST" && match![2] === "join") {
        const data = await body(req);
        const invite = typeof data.invite === "string" ? data.invite : "";
        if (
          !/^[A-Za-z0-9_-]{43}$/.test(invite) ||
          !timingSafeEqual(Buffer.from(invite), Buffer.from(room.invite))
        )
          fail(403, "This invitation is invalid.");
        if (!room.members.some((p) => p.id === guest.id)) {
          if (room.members.length >= 2 || room.status !== "waiting")
            fail(409, "This room is full or already started.");
          room.members.push({ id: guest.id, name: guest.name, ready: false });
          room.version++;
          broadcast(room);
        }
        return json(res, 200, { room: snapshot(room, guest.id) });
      }
      const index = member(room, guest.id);
      if (req.method === "GET" && !match![2])
        return json(res, 200, { room: snapshot(room, guest.id) });
      if (req.method !== "POST" || match![2] !== "action")
        fail(404, "Endpoint not found.");
      const data = await body(req);
      switch (data.type) {
        case "ready":
          if (room.status !== "waiting")
            fail(409, "The match already started.");
          room.members[index]!.ready = data.ready === true;
          break;
        case "start":
          if (index !== 0) fail(403, "Only the host can start.");
          if (
            room.status !== "waiting" ||
            room.members.length !== 2 ||
            !room.members.every((p) => p.ready)
          )
            fail(409, "Both players must be present and ready.");
          room.status = "playing";
          break;
        case "move":
          if (room.status !== "playing") fail(409, "The match is not active.");
          try {
            room.state = applyMove(room.state, index, data.move);
          } catch (e) {
            fail(400, e instanceof Error ? e.message : "Invalid move.");
          }
          if (room.state.winner !== null) room.status = "finished";
          break;
        case "rematch":
          if (room.status !== "finished")
            fail(409, "Finish the current match first.");
          room.rematch.add(guest.id);
          if (room.rematch.size === 2) {
            room.state = initialState(room.gameId);
            room.rematch.clear();
            room.status = "playing";
          }
          break;
        default:
          fail(400, "Unknown room action.");
      }
      room.version++;
      broadcast(room);
      return json(res, 200, { room: snapshot(room, guest.id) });
    } catch (error) {
      json(res, error instanceof ApiError ? error.status : 500, {
        error:
          error instanceof ApiError
            ? error.message
            : "Unexpected server error.",
      });
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.maxHeadersCount = 50;
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 });
  server.on("upgrade", (req, socket, head) => {
    try {
      rate(`ip:${req.socket.remoteAddress}`);
      const url = new URL(req.url ?? "/", "http://localhost");
      if (url.pathname !== "/ws") fail(404, "Unknown socket endpoint.");
      // Reject cross-site connections. With a reverse proxy preserve Host and Origin.
      if (
        req.headers.origin &&
        new URL(req.headers.origin).host !== req.headers.host
      )
        fail(403, "Origin not allowed.");
      const guest = session(url.searchParams.get("token") ?? undefined);
      const room = getRoom(url.searchParams.get("room") ?? "");
      member(room, guest.id);
      if ([...sockets.values()].filter((s) => s.id === guest.id).length >= 4)
        fail(429, "Too many open connections.");
      wss.handleUpgrade(req, socket, head, (ws) => {
        sockets.set(ws, { room: room.id, id: guest.id });
        alive.add(ws);
        broadcast(room);
        ws.on("pong", () => alive.add(ws));
        ws.on("message", () =>
          ws.close(1008, "Use authenticated HTTP actions."),
        );
        ws.on("error", () => {});
        ws.on("close", () => {
          sockets.delete(ws);
          if (rooms.has(room.id)) broadcast(room);
        });
      });
    } catch {
      socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      socket.destroy();
    }
  });
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of sessions)
      if (value.expires <= now) sessions.delete(key);
    for (const [key, value] of limits)
      if (value.reset <= now) limits.delete(key);
    for (const [key, room] of rooms)
      if (room.expires <= now) {
        rooms.delete(key);
        for (const [ws, info] of sockets)
          if (info.room === key) ws.close(1000, "Room expired");
      }
    for (const [ws, info] of sockets)
      if (![...sessions.values()].some((s) => s.id === info.id))
        ws.close(1000, "Session expired");
    for (const ws of sockets.keys()) {
      if (!alive.has(ws)) {
        ws.terminate();
        continue;
      }
      alive.delete(ws);
      ws.ping();
    }
  }, 30000);
  cleanup.unref();
  server.on("close", () => {
    clearInterval(cleanup);
    for (const ws of sockets.keys()) ws.terminate();
    wss.close();
  });
  return {
    server,
    close: async () => {
      for (const ws of sockets.keys()) ws.terminate();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const app = createApp();
  const port = Number(process.env.PORT ?? 3001);
  app.server.listen(port, "0.0.0.0", () =>
    console.log(`PlayNex beta authority listening on ${port}`),
  );
}
