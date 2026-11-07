import { test, expect, type Page } from "@playwright/test";

interface Snapshot {
  id: string;
  status: "waiting" | "playing" | "finished";
  version: number;
  playerIndex: 0 | 1;
  members: { name: string; connected: boolean }[];
  game: {
    gameId: string;
    turn: number;
    winner: null | number | "draw";
    board?: (number | null)[];
    round?: number;
    options?: string[];
  };
}

type BrowserState = Window & { betaRoom?: Snapshot; betaSocket?: WebSocket };
async function api(page: Page, path: string, body?: object, token?: string) {
  return page.evaluate(
    async ({ path, body, token }) => {
      const response = await fetch(path, {
        method: body ? "POST" : "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(`${response.status}: ${JSON.stringify(data)}`);
      return data;
    },
    { path, body, token },
  );
}
async function subscribe(page: Page, room: string, token: string) {
  await page.evaluate(
    ({ room, token }) => {
      const state = window as BrowserState;
      state.betaSocket = new WebSocket(
        `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws?room=${room}&token=${token}`,
      );
      state.betaSocket.onmessage = (event) => {
        state.betaRoom = JSON.parse(event.data).room;
      };
    },
    { room, token },
  );
  await expect
    .poll(() => page.evaluate(() => (window as BrowserState).betaRoom?.id))
    .toBe(room);
}

for (const gameId of ["tic-tac-toe", "four-in-a-row", "quick-trivia"]) {
  test(`${gameId}: independent browser clients synchronize, recover and rematch`, async ({
    browser,
  }) => {
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
    ]);
    try {
      const [a, b] = await Promise.all(
        contexts.map((context) => context.newPage()),
      );
      await Promise.all([a.goto("/"), b.goto("/")]);
      const [guestA, guestB] = await Promise.all([
        api(a, "/api/session", { name: "Player Alpha", ageConfirmed: true }),
        api(b, "/api/session", { name: "Player Beta", ageConfirmed: true }),
      ]);
      expect(guestA.token).not.toBe(guestB.token);
      const created = await api(a, "/api/rooms", { gameId }, guestA.token);
      const id: string = created.room.id;
      const action = (page: Page, token: string, body: object) =>
        api(page, `/api/rooms/${id}/action`, body, token);
      await api(
        b,
        `/api/rooms/${id}/join`,
        { invite: created.invite },
        guestB.token,
      );
      await Promise.all([
        subscribe(a, id, guestA.token),
        subscribe(b, id, guestB.token),
      ]);
      await action(a, guestA.token, { type: "ready", ready: true });
      await action(b, guestB.token, { type: "ready", ready: true });
      await action(a, guestA.token, { type: "start" });
      await expect
        .poll(() => b.evaluate(() => (window as BrowserState).betaRoom?.status))
        .toBe("playing");
      let room: Snapshot = (
        await api(a, `/api/rooms/${id}`, undefined, guestA.token)
      ).room;
      const moves =
        gameId === "tic-tac-toe" ? [0, 3, 1, 4, 2] : [0, 1, 0, 1, 0, 1, 0];
      const turns = gameId === "quick-trivia" ? 12 : moves.length;
      for (let turn = 0; turn < turns; turn++) {
        const player = room.game.turn;
        const move =
          gameId === "quick-trivia"
            ? { answer: 0 }
            : gameId === "tic-tac-toe"
              ? { cell: moves[turn] }
              : { column: moves[turn] };
        room = (
          await action(
            player === 0 ? a : b,
            player === 0 ? guestA.token : guestB.token,
            { type: "move", move },
          )
        ).room;
        await expect
          .poll(() =>
            b.evaluate(() => (window as BrowserState).betaRoom?.version),
          )
          .toBe(room.version);
      }
      expect(room.status).toBe("finished");
      expect(room.game.winner).toBe(gameId === "quick-trivia" ? "draw" : 0);
      await expect
        .poll(() =>
          a.evaluate(() => (window as BrowserState).betaRoom?.game.winner),
        )
        .toBe(room.game.winner);
      // Reload destroys the socket. A fresh client reconnects to authoritative state.
      await b.reload();
      await subscribe(b, id, guestB.token);
      expect(
        await b.evaluate(() => (window as BrowserState).betaRoom?.game),
      ).toEqual(room.game);
      await action(a, guestA.token, { type: "rematch" });
      await action(b, guestB.token, { type: "rematch" });
      await expect
        .poll(() => a.evaluate(() => (window as BrowserState).betaRoom?.status))
        .toBe("playing");
      await expect
        .poll(() =>
          b.evaluate(() => (window as BrowserState).betaRoom?.game.winner),
        )
        .toBeNull();
    } finally {
      await Promise.all(contexts.map((context) => context.close()));
    }
  });
}
