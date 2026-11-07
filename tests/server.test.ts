import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { WebSocket } from "ws";
import { createApp } from "../apps/server/src/index.js";

type Reply = {
  token: string;
  player: { id: string };
  invite: string;
  error?: string;
  room: {
    id: string;
    status: string;
    game: { winner: unknown; board: unknown[] };
    members: unknown[];
    version: number;
  };
};
async function fixture(options: Parameters<typeof createApp>[0] = {}) {
  const app = createApp(options);
  app.server.listen(0, "127.0.0.1");
  await once(app.server, "listening");
  const address = app.server.address();
  if (!address || typeof address === "string") throw new Error("No port");
  const base = `http://127.0.0.1:${address.port}`;
  async function request(
    path: string,
    value?: unknown,
    bearer?: string,
    method = value === undefined ? "GET" : "POST",
  ) {
    const response = await fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      },
      ...(value !== undefined ? { body: JSON.stringify(value) } : {}),
    });
    return { status: response.status, body: (await response.json()) as Reply };
  }
  async function guest(name: string) {
    return (await request("/api/session", { name, ageConfirmed: true })).body;
  }
  return { ...app, base, request, guest };
}

test("private room permissions, atomic turns, two socket clients, results, rematch and reconnect", async () => {
  const f = await fixture();
  try {
    const a = await f.guest("Player A");
    const b = await f.guest("Player B");
    const outsider = await f.guest("Outsider");
    const created = await f.request(
      "/api/rooms",
      { gameId: "tic-tac-toe" },
      a.token,
    );
    assert.equal(created.status, 201);
    const id = created.body.room.id;
    const path = `/api/rooms/${id}`;
    assert.equal(
      (await f.request(path, undefined, outsider.token)).status,
      403,
    );
    assert.equal(
      (await f.request(path + "/join", { invite: "wrong" }, b.token)).status,
      403,
    );
    assert.equal(
      (await f.request(path + "/join", { invite: "é".repeat(43) }, b.token))
        .status,
      403,
    );
    assert.equal(
      (
        await f.request(
          path + "/join",
          { invite: created.body.invite },
          b.token,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await f.request(
          path + "/join",
          { invite: created.body.invite },
          outsider.token,
        )
      ).status,
      409,
    );
    assert.equal(
      (await f.request(path + "/action", { type: "start" }, b.token)).status,
      403,
    );
    assert.equal(
      (await f.request(path + "/action", { type: "start" }, a.token)).status,
      409,
    );
    const socketUrl = f.base.replace("http:", "ws:") + `/ws?room=${id}&token=`;
    const wa = new WebSocket(socketUrl + a.token);
    const wb = new WebSocket(socketUrl + b.token);
    await Promise.all([once(wa, "open"), once(wb, "open")]);
    for (const guest of [a, b])
      assert.equal(
        (
          await f.request(
            path + "/action",
            { type: "ready", ready: true },
            guest.token,
          )
        ).status,
        200,
      );
    assert.equal(
      (await f.request(path + "/action", { type: "start" }, a.token)).body.room
        .status,
      "playing",
    );
    const updates: unknown[] = [];
    wb.on("message", (raw) => updates.push(JSON.parse(String(raw))));
    const raced = await Promise.all(
      [0, 1].map((cell) =>
        f.request(path + "/action", { type: "move", move: { cell } }, a.token),
      ),
    );
    assert.deepEqual(raced.map((r) => r.status).sort(), [200, 400]);
    const board = (await f.request(path, undefined, b.token)).body.room.game
      .board;
    const firstCell = board.findIndex((cell) => cell !== null);
    assert.ok(firstCell === 0 || firstCell === 1);
    // Complete a top-row win regardless of which concurrent request arrived first.
    for (const [guest, cell] of [
      [b, 3],
      [a, firstCell === 0 ? 1 : 0],
      [b, 4],
      [a, 2],
    ] as const) {
      assert.equal(
        (
          await f.request(
            path + "/action",
            { type: "move", move: { cell } },
            guest.token,
          )
        ).status,
        200,
      );
    }
    const finished = (await f.request(path, undefined, a.token)).body.room;
    assert.equal(finished.status, "finished");
    assert.equal(finished.game.winner, 0);
    assert.ok(
      updates.length > 0,
      "Independent guest socket received room updates",
    );
    assert.equal(
      (
        await f.request(
          path + "/action",
          { type: "move", move: { cell: 8 } },
          b.token,
        )
      ).status,
      409,
    );
    assert.equal(
      (await f.request(path + "/action", { type: "rematch" }, a.token)).body
        .room.status,
      "finished",
    );
    assert.equal(
      (await f.request(path + "/action", { type: "rematch" }, b.token)).body
        .room.status,
      "playing",
    );
    wb.close();
    await once(wb, "close");
    const reconnected = new WebSocket(socketUrl + b.token);
    const snapshot = once(reconnected, "message");
    await once(reconnected, "open");
    const [message] = await snapshot;
    assert.equal(JSON.parse(String(message)).room.status, "playing");
    wa.terminate();
    reconnected.terminate();
  } finally {
    await f.close();
  }
});

test("guest validation, room expiration and data deletion", async () => {
  const f = await fixture({ roomTtlMs: 5 });
  try {
    assert.equal(
      (await f.request("/api/session", { name: "Young", ageConfirmed: false }))
        .status,
      400,
    );
    assert.equal(
      (
        await f.request("/api/session", {
          name: "<script>",
          ageConfirmed: true,
        })
      ).status,
      400,
    );
    const a = await f.guest("Valid guest");
    const room = await f.request(
      "/api/rooms",
      { gameId: "tic-tac-toe" },
      a.token,
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(
      (await f.request(`/api/rooms/${room.body.room.id}`, undefined, a.token))
        .status,
      410,
    );
    assert.equal(
      (await f.request("/api/session/export", undefined, a.token)).status,
      200,
    );
    assert.equal(
      (await f.request("/api/session", undefined, a.token, "DELETE")).status,
      200,
    );
    assert.equal(
      (await f.request("/api/session/export", undefined, a.token)).status,
      401,
    );
  } finally {
    await f.close();
  }
});

test("IP rate limit rejects excess requests", async () => {
  const f = await fixture({ rateLimit: 2 });
  try {
    assert.equal((await f.request("/api/health")).status, 200);
    await f.request("/api/health");
    assert.equal((await f.request("/api/health")).status, 429);
  } finally {
    await f.close();
  }
});

for (const gameId of ["four-in-a-row", "quick-trivia"] as const) {
  test(`${gameId}: two independent clients complete an authoritative match`, async () => {
    const f = await fixture();
    try {
      const a = await f.guest("First player");
      const b = await f.guest("Second player");
      const created = (await f.request("/api/rooms", { gameId }, a.token)).body;
      const path = `/api/rooms/${created.room.id}`;
      await f.request(path + "/join", { invite: created.invite }, b.token);
      const sockets = [a, b].map(
        (guest) =>
          new WebSocket(
            f.base.replace("http:", "ws:") +
              `/ws?room=${created.room.id}&token=${guest.token}`,
          ),
      );
      await Promise.all(sockets.map((socket) => once(socket, "open")));
      const latest: Record<number, unknown> = {};
      sockets.forEach((socket, index) =>
        socket.on("message", (raw) => {
          latest[index] = JSON.parse(String(raw));
        }),
      );
      for (const guest of [a, b])
        await f.request(
          path + "/action",
          { type: "ready", ready: true },
          guest.token,
        );
      await f.request(path + "/action", { type: "start" }, a.token);
      if (gameId === "four-in-a-row") {
        for (const [guest, column] of [
          [a, 0],
          [b, 1],
          [a, 0],
          [b, 1],
          [a, 0],
          [b, 1],
          [a, 0],
        ] as const) {
          assert.equal(
            (
              await f.request(
                path + "/action",
                { type: "move", move: { column } },
                guest.token,
              )
            ).status,
            200,
          );
        }
      } else {
        const snapshot = (await f.request(path, undefined, a.token)).body.room
          .game;
        assert.equal("questions" in snapshot, false);
        assert.equal("pending" in snapshot, false);
        assert.equal("correct" in snapshot, false);
        for (let round = 0; round < 6; round++)
          for (const guest of [a, b]) {
            assert.equal(
              (
                await f.request(
                  path + "/action",
                  { type: "move", move: { answer: 0 } },
                  guest.token,
                )
              ).status,
              200,
            );
          }
      }
      const result = (await f.request(path, undefined, a.token)).body.room;
      assert.equal(result.status, "finished");
      assert.equal(result.game.winner, gameId === "four-in-a-row" ? 0 : "draw");
      // A read after the final broadcast gives sockets a turn to consume queued frames.
      await f.request(path, undefined, b.token);
      for (const index of [0, 1]) {
        const update = latest[index] as { room: Reply["room"] };
        assert.equal(update.room.status, "finished");
        assert.equal(update.room.game.winner, result.game.winner);
      }
      sockets.forEach((socket) => socket.terminate());
    } finally {
      await f.close();
    }
  });
}
