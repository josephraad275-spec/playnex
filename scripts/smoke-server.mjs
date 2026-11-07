import assert from "node:assert/strict";
import { once } from "node:events";
import { createApp } from "../apps/server/dist/index.mjs";
const app = createApp();
app.server.listen(0, "127.0.0.1");
await once(app.server, "listening");
try {
  const address = app.server.address();
  assert(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  const response = await fetch(`${origin}/api/health`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ok, true);
  const features = await fetch(`${origin}/api/features`);
  assert.equal(features.status, 200);
  const featureState = await features.json();
  assert.equal(typeof featureState.accounts, "boolean");
  assert.equal(featureState.admin, false);
  console.log(
    "Compiled authority starts and serves health/features; no deployment was performed.",
  );
} finally {
  await app.close();
}
