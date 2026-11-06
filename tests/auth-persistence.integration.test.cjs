const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");

for (const platform of ["web", "android"]) {
  test(`Firebase ${platform} SDK signs in, restores persisted account after app recreation, and persists logout`, async () => {
    const output = await new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [
          path.resolve(__dirname, "helpers/auth-persistence-worker.cjs"),
          platform,
        ],
        { windowsHide: true, env: process.env },
      );
      let log = "";
      const timer = setTimeout(() => {
        child.kill();
        reject(Error(`Auth ${platform} worker timed out`));
      }, 40000);
      child.stdout.on("data", (chunk) => {
        log += chunk;
      });
      child.stderr.on("data", (chunk) => {
        log += chunk;
      });
      child.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once("exit", (code) => {
        clearTimeout(timer);
        code === 0 ? resolve(log) : reject(Error(log));
      });
    });
    assert.match(output, new RegExp(`PASS ${platform}:`));
  });
}
