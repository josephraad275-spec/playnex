import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

// Real embedded PostgreSQL policies, with a minimal local Supabase auth-schema
// emulator. This does not validate hosted GoTrue, mail delivery or live projects.
test("database migrations enforce identity, RLS and privilege boundaries", async (t) => {
  const db = new PGlite();
  const alice = "00000000-0000-4000-8000-000000000001";
  const bob = "00000000-0000-4000-8000-000000000002";
  const admin = "00000000-0000-4000-8000-000000000003";
  try {
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb not null default '{}'::jsonb);
      create function auth.uid() returns uuid language sql stable as $$
        select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),
          nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid
      $$;
      grant usage on schema auth to anon, authenticated;
      grant execute on function auth.uid() to anon, authenticated;
    `);
    const migrationRoot = new URL("../supabase/migrations/", import.meta.url);
    for (const file of (await readdir(migrationRoot))
      .filter((name) => name.endsWith(".sql"))
      .sort()) {
      await db.exec(await readFile(new URL(file, migrationRoot), "utf8"));
    }
    for (const [id, name] of [
      [alice, "Alice"],
      [bob, "Bob"],
      [admin, "Administrator"],
    ]) {
      await db.query(
        "insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
        [
          id,
          `${name.toLowerCase()}@example.test`,
          JSON.stringify({
            display_name: name,
            age_confirmed: true,
            role: "admin",
          }),
        ],
      );
    }
    async function asUser<T>(id: string, action: () => Promise<T>): Promise<T> {
      await db.exec("set role authenticated");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
      try {
        return await action();
      } finally {
        await db.exec("reset role");
      }
    }
    await t.test(
      "signup trigger validates adult attestation and ignores injected roles",
      async () => {
        const profiles = await db.query<{ id: string }>(
          "select id from public.profiles",
        );
        assert.equal(profiles.rows.length, 3);
        assert.equal(
          (await db.query("select * from private.user_roles")).rows.length,
          0,
        );
        await assert.rejects(
          db.query(
            "insert into auth.users(id,raw_user_meta_data) values(gen_random_uuid(),$1)",
            [JSON.stringify({ display_name: "Child", age_confirmed: false })],
          ),
        );
        await assert.rejects(
          db.query(
            "insert into auth.users(id,raw_user_meta_data) values(gen_random_uuid(),$1)",
            [JSON.stringify({ display_name: "<script>", age_confirmed: true })],
          ),
        );
      },
    );
    await t.test("players read and update only their own profile", async () => {
      await asUser(alice, async () => {
        const result = await db.query<{ id: string }>(
          "select id from public.profiles",
        );
        assert.deepEqual(
          result.rows.map((row) => row.id),
          [alice],
        );
        await db.query(
          "update public.profiles set display_name='Alice Two' where id=$1",
          [alice],
        );
        await db.query(
          "update public.profiles set display_name='Stolen' where id=$1",
          [bob],
        );
        await assert.rejects(
          db.query(
            "update public.profiles set adult_attested_at=null where id=$1",
            [alice],
          ),
        );
        await assert.rejects(
          db.query(
            "insert into public.profiles(id,display_name) values($1,'Fake')",
            [bob],
          ),
        );
      });
      assert.equal(
        (
          await db.query<{ display_name: string }>(
            "select display_name from public.profiles where id=$1",
            [bob],
          )
        ).rows[0]?.display_name,
        "Bob",
      );
    });
    await t.test(
      "clients cannot read private game state or grant roles and entitlements",
      async () => {
        await asUser(alice, async () => {
          for (const sql of [
            "select * from public.rooms",
            "select * from public.room_invitations",
            "select * from private.user_roles",
            `insert into private.user_roles(user_id,role) values('${alice}','admin')`,
            `insert into public.entitlements(user_id,product_id) values('${alice}','premium')`,
          ])
            await assert.rejects(db.exec(sql));
        });
        await db.exec("set role anon");
        try {
          await assert.rejects(db.exec("select * from public.profiles"));
          await assert.rejects(db.exec("select * from public.blocks"));
        } finally {
          await db.exec("reset role");
        }
      },
    );
    await t.test(
      "reports and blocks enforce ownership and cannot be forged",
      async () => {
        await asUser(alice, async () => {
          await db.query(
            "insert into public.reports(reporter_id,reported_user_id,reason) values($1,$2,'Unsafe behavior')",
            [alice, bob],
          );
          await db.query(
            "insert into public.blocks(blocker_id,blocked_id) values($1,$2)",
            [alice, bob],
          );
          await assert.rejects(
            db.query(
              "insert into public.reports(reporter_id,reported_user_id,reason) values($1,$2,'Forged')",
              [bob, alice],
            ),
          );
          await assert.rejects(
            db.query(
              "insert into public.blocks(blocker_id,blocked_id) values($1,$2)",
              [bob, alice],
            ),
          );
          assert.equal(
            (await db.query("select * from public.reports")).rows.length,
            1,
          );
        });
        await asUser(bob, async () => {
          assert.equal(
            (await db.query("select * from public.reports")).rows.length,
            0,
          );
          assert.equal(
            (await db.query("select * from public.blocks")).rows.length,
            0,
          );
          await db.exec("delete from public.blocks");
        });
        assert.equal(
          (await db.query("select * from public.blocks")).rows.length,
          1,
        );
      },
    );
    await t.test(
      "disabled catalog metadata is visible only to backend assigned administrators",
      async () => {
        await db.exec(
          "insert into public.game_catalog(id,metadata,enabled) values('hidden','{}',false),('visible','{}',true)",
        );
        await asUser(alice, async () =>
          assert.equal(
            (await db.query("select * from public.game_catalog")).rows.length,
            1,
          ),
        );
        await db.query(
          "insert into private.user_roles(user_id,role) values($1,'admin')",
          [admin],
        );
        await asUser(admin, async () =>
          assert.equal(
            (await db.query("select * from public.game_catalog")).rows.length,
            2,
          ),
        );
      },
    );
    await t.test(
      "deleting auth identity cascades profile and owned safety data",
      async () => {
        await db.query("delete from auth.users where id=$1", [alice]);
        assert.equal(
          (await db.query("select * from public.profiles where id=$1", [alice]))
            .rows.length,
          0,
        );
        assert.equal(
          (await db.query("select * from public.blocks")).rows.length,
          0,
        );
        assert.equal(
          (await db.query("select * from public.reports")).rows.length,
          0,
        );
      },
    );
  } finally {
    await db.close();
  }
});
