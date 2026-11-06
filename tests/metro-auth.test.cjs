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
