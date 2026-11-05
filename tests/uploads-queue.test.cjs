require("./helpers/register-local.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

test("uploads queue drains pages, rejects partial failures, repeated cursors and account changes", async () => {
  const alice = { uid: "alice" },
    auth = { currentUser: alice };
  const calls = [];
  let fetchPage;
  const original = Module._load;
  Module._load = function (request, parent, main) {
    if (parent?.filename.endsWith("uploadsService.ts")) {
      if (request === "./firebase") return { getFirebaseAuth: () => auth };
      if (request === "./backendService")
        return {
          backendGet: async (path, params) => {
            calls.push({ path, params });
            return fetchPage(params);
          },
        };
    }
    return original.call(this, request, parent, main);
  };
  try {
    const { loadUploadsQueue } = require("../src/services/uploadsService.ts");
    const song = (id) => ({ kind: "song", item: { id } });
    fetchPage = async ({ cursor }) =>
      cursor
        ? { items: [song("b")], hasMore: false, nextCursor: null }
        : { items: [song("a")], hasMore: true, nextCursor: "next" };
    assert.deepEqual(
      (await loadUploadsQueue()).map((row) => row.id),
      ["a", "b"],
    );
    assert.equal(calls.length, 2);
    assert.equal(calls[0].params.q, undefined); // Complete uploads, independent of visible search.
    assert.equal(calls[1].params.cursor, "next");
    fetchPage = async ({ cursor }) => {
      if (cursor) throw new Error("network");
      return { items: [song("a")], hasMore: true, nextCursor: "next" };
    };
    await assert.rejects(loadUploadsQueue(), /network/);
    fetchPage = async () => ({ items: [], hasMore: true, nextCursor: "same" });
    await assert.rejects(loadUploadsQueue(), /Không thể tải đủ/);
    fetchPage = async () => {
      auth.currentUser = { uid: "bob" };
      return { items: [song("a")], hasMore: false, nextCursor: null };
    };
    await assert.rejects(loadUploadsQueue(), /Phiên tải/);
    auth.currentUser = alice;
    await assert.rejects(
      loadUploadsQueue(() => false),
      /Phiên tải/,
    );
  } finally {
    Module._load = original;
  }
});
