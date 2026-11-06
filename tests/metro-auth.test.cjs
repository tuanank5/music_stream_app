const { test } = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

test("Metro delegates auth resolution with the original platform and only adjusts Portal's origin", () => {
  const filename = require.resolve("../metro.config.js");
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(require("node:path").dirname(filename));
  const calls = [];
  const resolve = (...args) => {
    calls.push(args);
    return { type: "sourceFile", filePath: "selected-by-Metro" };
  };
  mod.require = (request) => {
    if (request === "./tools/metro-cache.cjs")
      return require("../tools/metro-cache.cjs");
    if (request === "expo/metro-config")
      return {
        getDefaultConfig: () => ({ resolver: { resolveRequest: resolve } }),
      };
    throw Error(`Unexpected dependency ${request}`);
  };
  mod._compile(require("node:fs").readFileSync(filename, "utf8"), filename);
  const context = {
    originModulePath: "/project/src/services/firebase/index.ts",
  };
  for (const platform of ["web", "android"]) {
    mod.exports.resolver.resolveRequest(context, "./auth", platform);
    assert.deepEqual(calls.at(-1), [context, "./auth", platform]);
    mod.exports.resolver.resolveRequest(context, "firebase/auth", platform);
    assert.deepEqual(calls.at(-1), [context, "firebase/auth", platform]);
  }
  mod.exports.resolver.resolveRequest(context, "@tamagui/portal", "android");
  assert.equal(
    calls.at(-1)[0].originModulePath,
    require.resolve("tamagui/package.json"),
  );
  assert.equal(calls.at(-1)[2], "android");
});

test("Metro cache bounds concurrent reads/writes and recovers slots after errors", async () => {
  const { limitCacheConcurrency } = require("../tools/metro-cache.cjs");
  let active = 0,
    peak = 0,
    writes = 0;
  class Store {
    #value = "cached";
    async #io(key) {
      active++;
      peak = Math.max(peak, active);
      try {
        await new Promise((resolve) => setTimeout(resolve, 1));
        if (key === "bad") throw Error("cache read failed");
        return this.#value;
      } finally {
        active--;
      }
    }
    get(key) {
      return this.#io(key);
    }
    async set() {
      await this.#io("write");
      writes++;
    }
    clear() {
      this.#value = "cleared";
    }
  }
  const [store] = limitCacheConcurrency([new Store()], 3);
  const results = await Promise.allSettled(
    Array.from({ length: 50 }, (_, i) =>
      i % 5 === 0 ? store.set("key", i) : store.get(i === 1 ? "bad" : "key"),
    ),
  );
  assert.ok(peak <= 3);
  assert.equal(
    results.filter((result) => result.status === "rejected").length,
    1,
  );
  assert.equal(writes, 10);
  store.clear();
  assert.equal(await store.get("after-error"), "cleared");
});
