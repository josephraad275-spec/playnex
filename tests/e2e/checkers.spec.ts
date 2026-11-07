import { test, expect, type Page } from "@playwright/test";
import {
  legalMoves,
  type CheckersState,
} from "../../packages/games/src/checkers";

async function getRoom(
  page: Page,
  id: string,
): Promise<{ version: number; game: CheckersState }> {
  return page.evaluate(async (id) => {
    const guest = JSON.parse(sessionStorage.getItem("playnex-session")!);
    const response = await fetch(`/api/rooms/${id}`, {
      headers: { Authorization: `Bearer ${guest.token}` },
    });
    if (!response.ok)
      throw new Error(`Room snapshot failed ${response.status}`);
    return (await response.json()).room;
  }, id);
}

test("Checkers: independent players complete a legal match, reconnect and rematch", async ({
  browser,
}) => {
  test.setTimeout(60000);
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
  ]);
  try {
    const [host, friend] = await Promise.all(
      contexts.map((context) => context.newPage()),
    );
    await host.goto("/");
    await host
      .getByRole("button", { name: "Create a private room", exact: true })
      .click();
    await host.getByLabel("Choose a game").selectOption("checkers");
    await host.getByLabel("Your display name").fill("Checkers Host");
    await host.getByRole("checkbox").check();
    await host
      .getByRole("button", { name: "Create room", exact: true })
      .click();
    await expect(host.getByLabel("Room invitation")).toBeVisible();
    const invitation = await host.getByLabel("Room invitation").inputValue();
    const id = new URL(invitation).searchParams.get("room")!;
    await friend.goto(invitation);
    await friend.getByLabel("Your display name").fill("Checkers Friend");
    await friend.getByRole("checkbox").check();
    await friend
      .getByRole("button", { name: "Join private room", exact: true })
      .click();
    await host.getByRole("button", { name: /I’m ready/ }).click();
    await friend.getByRole("button", { name: /I’m ready/ }).click();
    await expect(
      host.getByRole("button", { name: "Start match" }),
    ).toBeEnabled();
    await host.getByRole("button", { name: "Start match" }).click();
    let room = await getRoom(host, id);
    const illegal = await host.evaluate(async (id) => {
      const guest = JSON.parse(sessionStorage.getItem("playnex-session")!);
      return (
        await fetch(`/api/rooms/${id}/action`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${guest.token}`,
          },
          body: JSON.stringify({ type: "move", move: { from: 17, to: 0 } }),
        })
      ).status;
    }, id);
    expect(illegal).toBe(400);
    expect((await getRoom(host, id)).game).toEqual(room.game);
    async function move(from: number, to: number) {
      const page = room.game.turn === 0 ? host : friend;
      const version = room.version;
      const source = page.getByRole("button", {
        name: new RegExp(`^Square ${from + 1},`),
      });
      await expect(source).toBeEnabled();
      await source.click();
      const destination = page.getByRole("button", {
        name: new RegExp(`^Square ${to + 1},`),
      });
      await expect(destination).toBeEnabled();
      await destination.click();
      await expect
        .poll(async () => (await getRoom(host, id)).version)
        .toBeGreaterThan(version);
      room = await getRoom(host, id);
    }
    await move(17, 24);
    await expect(
      friend.getByRole("button", { name: /^Square 25, opponent piece/ }),
    ).toBeVisible();
    await move(40, 33);
    await expect(
      host.getByRole("button", { name: /^Square 34, opponent piece/ }),
    ).toBeVisible();
    await friend.reload();
    await expect(
      friend.getByRole("button", { name: /^Square 34, your piece/ }),
    ).toBeVisible();
    let random = 7,
      plies = 0;
    while (room.game.winner === null && plies < 100) {
      const moves = legalMoves(room.game);
      expect(moves.length).toBeGreaterThan(0);
      random = (random * 1664525 + 1013904223) >>> 0;
      const next = moves[random % moves.length]!;
      await move(next.from, next.to);
      plies++;
    }
    expect(room.game.winner).not.toBeNull();
    const result =
      room.game.winner === "draw"
        ? "A well-matched draw!"
        : `${room.game.winner === 0 ? "Checkers Host" : "Checkers Friend"} wins!`;
    await expect(
      host.getByRole("heading", { name: result, exact: true }),
    ).toBeVisible();
    await expect(
      friend.getByRole("heading", { name: result, exact: true }),
    ).toBeVisible();
    await host.getByRole("button", { name: "Request rematch" }).click();
    await friend.getByRole("button", { name: "Request rematch" }).click();
    await expect(
      host.getByRole("button", { name: /^Square 18, your piece/ }),
    ).toBeEnabled();
    expect((await getRoom(host, id)).game.winner).toBeNull();
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
