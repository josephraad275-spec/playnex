import { readdir, readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
const files = await readdir(
  new URL("../apps/web/dist/assets/", import.meta.url),
);
let js = 0,
  css = 0;
for (const name of files) {
  if (!/\.(js|css)$/.test(name)) continue;
  const bytes = await readFile(
    new URL(`../apps/web/dist/assets/${name}`, import.meta.url),
  );
  const compressed = gzipSync(bytes).byteLength;
  console.log(`${name}: ${bytes.byteLength} bytes; ${compressed} gzip bytes`);
  if (name.endsWith(".js")) js += compressed;
  else css += compressed;
}
if (js > 140_000 || css > 30_000) {
  throw new Error(
    `Bundle budget exceeded: JS ${js}/140000 gzip bytes, CSS ${css}/30000 gzip bytes`,
  );
}
console.log(
  `Bundle budgets pass: all JS ${js} gzip bytes; CSS ${css} gzip bytes. These are build sizes, not measured device loading times.`,
);
