import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createApp } from "../apps/server/src/index.js";

const adminId = "b3877992-192b-4b58-a063-f5f8dcb912a0";
const userId = "b3877992-192b-4b58-a063-f5f8dcb912a1";
function provider() {
  const calls: {
    path: string;
    method: string;
    authorization: string;
    body: Record<string, unknown>;
  }[] = [];
  const profiles = new Map(
    [adminId, userId].map((id) => [
      id,
      {
        id,
        display_name: id === adminId ? "Admin player" : "Account player",
        avatar: "orbit",
      },
    ]),
  );
  let available = true;
  const fetchMock: typeof fetch = async (input, init) => {
    if (!available) throw new Error("Provider offline: never expose this text");
    const url = new URL(String(input));
    const path = url.pathname;
    const authorization = new Headers(init?.headers).get("Authorization") ?? "";
    const body = JSON.parse(
      typeof init?.body === "string" ? init.body : "{}",
    ) as Record<string, unknown>;
    calls.push({ path, method: init?.method ?? "GET", authorization, body });
    const id =
      authorization === "Bearer admin-access"
        ? adminId
        : authorization === "Bearer user-access"
          ? userId
          : undefined;
    const response = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), { status });
    if (path === "/auth/v1/signup")
      return response({ user: { id: userId } }, 200);
    if (path === "/auth/v1/token")
      return body.password === "valid-password-123"
        ? response({
            access_token:
              body.email === "admin@example.com"
                ? "admin-access"
                : "user-access",
          })
        : response({ error: "Sensitive provider failure" }, 400);
    if (path === "/auth/v1/user") {
      if (!id) return response({ error: "bad" }, 401);
      return response({
        id,
        email: "private@example.com",
        user_metadata: { role: "admin", display_name: "Account player" },
      });
    }
    if (path === "/rest/v1/profiles") {
      if (!id) return response({}, 401);
      if (url.searchParams.get("id") !== `eq.${id}`) return response([], 200);
      const profile = profiles.get(id)!;
      if (init?.method === "PATCH") {
        profile.display_name = String(body.display_name);
        profile.avatar = String(body.avatar);
      }
      return response([profile]);
    }
    if (path === "/auth/v1/recover" || path === "/auth/v1/logout")
      return response({});
    if (path.startsWith("/auth/v1/admin/users/"))
      return authorization === "Bearer service-key"
        ? response({})
        : response({}, 403);
    return response({}, 404);
  };
  return {
    fetchMock,
    calls,
    offline: () => {
      available = false;
    },
  };
}
type Data = {
  reportId: string;
  report: { status: string };
  token: string;
  player: { id: string; kind: string };
  confirmationRequired: boolean;
  accounts: boolean;
  admin: boolean;
  error: string;
  profile: { name: string; avatar: string };
  room: { id: string };
  invite: string;
  reports: { id: string }[];
  blocks: { playerId: string }[];
  catalog: { gameId: string; enabled: boolean }[];
};
async function fixture(options: Parameters<typeof createApp>[0] = {}) {
  const app = createApp(options);
  app.server.listen(0, "127.0.0.1");
  await once(app.server, "listening");
  const address = app.server.address();
  if (!address || typeof address === "string") throw new Error("No port");
  const port = address.port;
  async function request(
    path: string,
    body?: unknown,
    token?: string,
    method = body === undefined ? "GET" : "POST",
  ) {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: (await response.json()) as Data };
  }
  return {
    ...app,
    request,
    guest: async (name: string) =>
      (await request("/api/session", { name, ageConfirmed: true })).body,
  };
}

test("unconfigured accounts fail explicitly while guest features remain available", async () => {
  const app = await fixture();
  try {
    assert.equal((await app.request("/api/features")).body.accounts, false);
    assert.equal(
      (
        await app.request("/api/auth/login", {
          email: "a@example.com",
          password: "password-is-secret",
        })
      ).status,
      503,
    );
    const guest = await app.guest("Guest player");
    assert.equal(
      (await app.request("/api/admin", undefined, guest.token)).status,
      403,
    );
    assert.equal(
      (await app.request("/api/profile", undefined, guest.token)).body.profile
        .name,
      "Guest player",
    );
  } finally {
    await app.close();
  }
});

test("admin report review rejects guests and arbitrary status; guest deletion removes safety data", async () => {
  const mock = provider();
  const app = await fixture({
    supabase: {
      url: "https://provider.example",
      anonKey: "anon-key",
      fetch: mock.fetchMock,
    },
    adminIds: [adminId],
  });
  try {
    const a = await app.guest("Reporting guest"),
      b = await app.guest("Opponent guest");
    const created = (
      await app.request("/api/rooms", { gameId: "tic-tac-toe" }, a.token)
    ).body;
    await app.request(
      `/api/rooms/${created.room.id}/join`,
      { invite: created.invite },
      b.token,
    );
    const report = (
      await app.request(
        "/api/reports",
        {
          roomId: created.room.id,
          playerId: b.player.id,
          reason: "A detailed report for moderator review.",
        },
        a.token,
      )
    ).body;
    const update = { reportId: report.reportId, status: "reviewing" };
    assert.equal(
      (await app.request("/api/admin/reports", update, a.token, "PATCH"))
        .status,
      403,
    );
    const admin = (
      await app.request("/api/auth/exchange", {
        accessToken: "admin-access",
        ageConfirmed: true,
      })
    ).body;
    assert.equal(
      (
        await app.request(
          "/api/admin/reports",
          { ...update, status: "deleted" },
          admin.token,
          "PATCH",
        )
      ).status,
      400,
    );
    assert.equal(
      (await app.request("/api/admin/reports", update, admin.token, "PATCH"))
        .body.report.status,
      "reviewing",
    );
    await app.request(
      "/api/blocks",
      { roomId: created.room.id, playerId: b.player.id },
      a.token,
    );
    const exported = (
      await app.request("/api/session/export", undefined, a.token)
    ).body;
    assert.equal(exported.blocks.length, 1);
    assert.equal(exported.reports.length, 1);
    await app.request("/api/session", undefined, b.token, "DELETE");
    assert.equal(
      (await app.request("/api/blocks", undefined, a.token)).body.blocks.length,
      0,
    );
    assert.equal(
      (await app.request("/api/reports", undefined, a.token)).body.reports
        .length,
      0,
    );
  } finally {
    await app.close();
  }
});

test("recovery token verification and password reset invalidate local account sessions", async () => {
  const mock = provider();
  const app = await fixture({
    supabase: {
      url: "https://provider.example",
      anonKey: "anon-key",
      fetch: mock.fetchMock,
    },
  });
  try {
    const user = (
      await app.request("/api/auth/exchange", {
        accessToken: "user-access",
        ageConfirmed: true,
      })
    ).body;
    assert.equal(
      (await app.request("/api/auth/recover", { email: "user@example.com" }))
        .status,
      200,
    );
    assert.equal(
      (
        await app.request("/api/auth/reset", {
          accessToken: "forged-access",
          password: "new-password-is-secret",
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await app.request("/api/auth/reset", {
          accessToken: "user-access",
          password: "new-password-is-secret",
        })
      ).status,
      200,
    );
    assert.equal(
      (await app.request("/api/profile", undefined, user.token)).status,
      401,
    );
    assert.ok(
      mock.calls.some(
        (call) =>
          call.path === "/auth/v1/user" &&
          call.method === "PUT" &&
          call.authorization === "Bearer user-access",
      ),
    );
  } finally {
    await app.close();
  }
});

test("provider-confirmed identity, profile RLS, safe login errors and role enforcement", async () => {
  const mock = provider();
  const app = await fixture({
    supabase: {
      url: "https://provider.example",
      anonKey: "anon-key",
      fetch: mock.fetchMock,
    },
    adminIds: [adminId],
  });
  try {
    assert.equal((await app.request("/api/features")).body.accounts, true);
    const signup = await app.request("/api/auth/signup", {
      email: "new@example.com",
      password: "valid-password-123",
      name: "New player",
      ageConfirmed: true,
    });
    assert.equal(signup.status, 201);
    assert.equal(signup.body.confirmationRequired, true);
    const signupCall = mock.calls.find(
      (call) => call.path === "/auth/v1/signup",
    );
    assert.deepEqual(signupCall?.body.data, {
      display_name: "New player",
      age_confirmed: true,
    });
    const bad = await app.request("/api/auth/login", {
      email: "new@example.com",
      password: "wrong-password-123",
      ageConfirmed: true,
    });
    assert.equal(bad.status, 400);
    assert.ok(!JSON.stringify(bad.body).includes("Sensitive"));
    const user = (
      await app.request("/api/auth/login", {
        email: "user@example.com",
        password: "valid-password-123",
        ageConfirmed: true,
        id: adminId,
        role: "admin",
      })
    ).body;
    assert.equal(user.player.id, userId);
    assert.equal(user.player.kind, "registered");
    assert.equal(
      (await app.request("/api/admin", undefined, user.token)).status,
      403,
    );
    const patch = await app.request(
      "/api/profile",
      { name: "Updated name", avatar: "nova", id: adminId },
      user.token,
      "PATCH",
    );
    assert.equal(patch.body.profile.name, "Updated name");
    assert.equal(patch.body.profile.avatar, "nova");
    assert.equal(
      mock.calls.find(
        (call) => call.path === "/rest/v1/profiles" && call.method === "PATCH",
      )?.authorization,
      "Bearer user-access",
    );
    const admin = (
      await app.request("/api/auth/login", {
        email: "admin@example.com",
        password: "valid-password-123",
        ageConfirmed: true,
      })
    ).body;
    assert.equal(
      (await app.request("/api/features", undefined, admin.token)).body.admin,
      true,
    );
    assert.equal(
      (await app.request("/api/admin", undefined, admin.token)).status,
      200,
    );
    assert.equal(
      (
        await app.request(
          "/api/admin/catalog",
          { gameId: "tic-tac-toe", enabled: false },
          admin.token,
          "PATCH",
        )
      ).status,
      200,
    );
    assert.equal(
      (await app.request("/api/rooms", { gameId: "tic-tac-toe" }, user.token))
        .status,
      403,
    );
    assert.equal(
      (await app.request("/api/rooms", { gameId: "four-in-a-row" }, user.token))
        .status,
      201,
    );
    assert.equal(
      (await app.request("/api/account", undefined, user.token, "DELETE"))
        .status,
      503,
    );
    assert.equal(
      (await app.request("/api/auth/logout", {}, user.token)).status,
      200,
    );
    assert.equal(
      (await app.request("/api/profile", undefined, user.token)).status,
      401,
    );
    assert.equal(
      (
        await app.request("/api/auth/exchange", {
          accessToken: "forged-access",
          ageConfirmed: true,
        })
      ).status,
      401,
    );
    mock.offline();
    const unavailable = await app.request("/api/auth/recover", {
      email: "someone@example.com",
    });
    assert.equal(unavailable.status, 503);
    assert.ok(!unavailable.body.error.includes("never expose"));
  } finally {
    await app.close();
  }
});

test("reports require room membership; blocking closes rooms and prevents invites in both directions", async () => {
  const app = await fixture();
  try {
    const a = await app.guest("Player one"),
      b = await app.guest("Player two"),
      outsider = await app.guest("Other player");
    const created = (
      await app.request("/api/rooms", { gameId: "tic-tac-toe" }, a.token)
    ).body;
    const roomId = created.room.id;
    await app.request(
      `/api/rooms/${roomId}/join`,
      { invite: created.invite },
      b.token,
    );
    const report = {
      roomId,
      playerId: b.player.id,
      reason: "Unacceptable player behavior during this match.",
    };
    assert.equal(
      (await app.request("/api/reports", report, outsider.token)).status,
      403,
    );
    assert.equal(
      (await app.request("/api/reports", { ...report, reason: "bad" }, a.token))
        .status,
      400,
    );
    assert.equal(
      (await app.request("/api/reports", report, a.token)).status,
      201,
    );
    assert.equal(
      (await app.request("/api/reports", undefined, a.token)).body.reports
        .length,
      1,
    );
    assert.equal(
      (await app.request("/api/reports", undefined, b.token)).body.reports
        .length,
      0,
    );
    assert.equal(
      (
        await app.request(
          "/api/blocks",
          { roomId, playerId: b.player.id },
          a.token,
        )
      ).status,
      200,
    );
    assert.equal(
      (await app.request(`/api/rooms/${roomId}`, undefined, b.token)).status,
      410,
    );
    assert.equal(
      (await app.request("/api/blocks", undefined, a.token)).body.blocks[0]
        ?.playerId,
      b.player.id,
    );
    for (const [host, joiner] of [
      [a, b],
      [b, a],
    ]) {
      const room = (
        await app.request("/api/rooms", { gameId: "tic-tac-toe" }, host!.token)
      ).body;
      assert.equal(
        (
          await app.request(
            `/api/rooms/${room.room.id}/join`,
            { invite: room.invite },
            joiner!.token,
          )
        ).status,
        403,
      );
    }
    assert.equal(
      (
        await app.request(
          "/api/blocks",
          { playerId: b.player.id },
          a.token,
          "DELETE",
        )
      ).status,
      200,
    );
    const retry = (
      await app.request("/api/rooms", { gameId: "tic-tac-toe" }, a.token)
    ).body;
    assert.equal(
      (
        await app.request(
          `/api/rooms/${retry.room.id}/join`,
          { invite: retry.invite },
          b.token,
        )
      ).status,
      200,
    );
  } finally {
    await app.close();
  }
});

test("permanent account deletion uses server service credential and verified identity only", async () => {
  const mock = provider();
  const app = await fixture({
    supabase: {
      url: "https://provider.example",
      anonKey: "anon-key",
      serviceRoleKey: "service-key",
      fetch: mock.fetchMock,
    },
  });
  try {
    const user = (
      await app.request("/api/auth/exchange", {
        accessToken: "user-access",
        ageConfirmed: true,
        id: adminId,
      })
    ).body;
    assert.equal(
      (await app.request("/api/account", undefined, user.token, "DELETE"))
        .status,
      200,
    );
    const deletion = mock.calls.find((call) =>
      call.path.startsWith("/auth/v1/admin/users/"),
    );
    assert.equal(deletion?.path, `/auth/v1/admin/users/${userId}`);
    assert.equal(deletion?.authorization, "Bearer service-key");
    assert.equal(
      (await app.request("/api/profile", undefined, user.token)).status,
      401,
    );
  } finally {
    await app.close();
  }
});
