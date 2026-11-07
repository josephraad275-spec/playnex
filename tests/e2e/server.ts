// Browser suites share one local IP. Keep their test-only allowance separate
// from the development/production server's default abuse prevention settings.
import { createApp } from "../../apps/server/src/index";
const app = createApp({ rateLimit: 1000 });
app.server.listen(3001, "127.0.0.1", () =>
  console.log("PlayNex isolated browser-test authority on 127.0.0.1:3001"),
);
