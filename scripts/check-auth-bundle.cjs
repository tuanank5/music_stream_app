const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const [platform, directory] = process.argv.slice(2);
assert.ok(
  ["web", "android"].includes(platform),
  "Use web or android and an export directory",
);
assert.ok(directory, "An export directory is required");
const root = path.resolve(directory);
const sources = new Set();
let maps = 0;
function collect(map) {
  for (const source of map.sources || []) {
    sources.add(source.replaceAll("\\", "/"));
  }
  // Web exports may use indexed source maps; Hermes generally uses flat maps.
  for (const section of map.sections || []) {
    if (section.map) collect(section.map);
  }
}
function walk(folder) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const file = path.join(folder, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.name.endsWith(".map")) {
      maps++;
      collect(JSON.parse(fs.readFileSync(file, "utf8")));
    }
  }
}
walk(root);
assert.ok(maps, "No source maps found; export with --source-maps");
const app = [...sources].filter((source) =>
  /\/src\/services\/firebase\/auth(?:\.(?:native|web))?\.ts$/.test(source),
);
const sdk = [...sources].filter((source) =>
  source.includes("/@firebase/auth/dist/"),
);
const expectedApp = platform === "android" ? "auth.native.ts" : "auth.ts";
const expectedSdk = platform === "android" ? "rn" : "esm";
assert.ok(
  app.some((source) => source.endsWith(`/${expectedApp}`)),
  `Missing ${expectedApp}`,
);
assert.ok(
  app.every((source) => source.endsWith(`/${expectedApp}`)),
  `Unexpected Auth implementation: ${app}`,
);
assert.ok(
  sdk.some((source) => source.includes(`/dist/${expectedSdk}/`)),
  `Missing Firebase ${expectedSdk} SDK`,
);
assert.ok(
  !sdk.some((source) =>
    source.includes(`/dist/${platform === "android" ? "esm" : "rn"}/`),
  ),
  "Wrong-platform Firebase SDK is included",
);
const report = { platform, maps, app, sdk };
fs.writeFileSync(
  path.join(root, "auth-resolution.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
