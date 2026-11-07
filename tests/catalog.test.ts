import test from "node:test";
import assert from "node:assert/strict";
import {
  catalog,
  getGameMetadata,
  searchCatalog,
} from "../packages/game-sdk/src/index";

test("catalog includes twenty unique game records and only three playable games", () => {
  assert.equal(catalog.length, 20);
  assert.equal(new Set(catalog.map((game) => game.id)).size, 20);
  assert.deepEqual(
    catalog
      .filter((game) => game.availability === "playable")
      .map((game) => game.id)
      .sort(),
    ["four-in-a-row", "quick-trivia", "tic-tac-toe"],
  );
  for (const game of catalog) {
    for (const field of [
      "id",
      "title",
      "description",
      "category",
      "ageRating",
      "version",
      "thumbnail",
      "developer",
      "license",
    ] as const)
      assert.ok(game[field].length > 0);
    assert.ok(game.minPlayers >= 1 && game.maxPlayers >= game.minPlayers);
    assert.equal(game.monetization, "free");
    assert.equal(game.ageRating, "Unrated; private adult beta only");
    assert.deepEqual(game.languages, ["en"]);
    assert.deepEqual(game.devices, ["android-web", "ios-web", "desktop-web"]);
    if (game.availability === "planned") {
      assert.equal(game.license, "Not implemented");
      assert.equal(game.multiplayer, false);
    }
  }
});
test("catalog lookup and search find records without exposing planned games as playable", () => {
  assert.equal(getGameMetadata("chess")?.availability, "planned");
  assert.equal(getGameMetadata("unknown"), undefined);
  assert.equal(searchCatalog("  TRIVIA  ", "playable")[0]?.id, "quick-trivia");
  assert.equal(searchCatalog("Chess", "playable").length, 0);
  assert.equal(searchCatalog("", "playable").length, 3);
});
