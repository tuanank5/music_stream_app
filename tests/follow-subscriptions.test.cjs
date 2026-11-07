require("./helpers/register-local.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

test("followed songs recover from unfollow races, suppress superseded errors and still expose real failures", async () => {
  const requests = [];
  const auth = { currentUser: { uid: "alice" } };
  const load = Module._load;
  Module._load = function (request, parent, main) {
    if (request === "./firebase" && /services/.test(parent.filename))
      return { getFirebaseAuth: () => auth };
    if (request === "./backendService" && /services/.test(parent.filename))
      return {
        backendGet: (path) =>
          new Promise((resolve, reject) =>
            requests.push({ path, resolve, reject }),
          ),
      };
    return load.call(this, request, parent, main);
  };
  let stop;
  const tick = () => new Promise((resolve) => setImmediate(resolve));
  const denied = () =>
    Object.assign(new Error("Không còn theo dõi nghệ sĩ."), { status: 403 });
  try {
    const {
      watchFollowedArtistSongs,
    } = require("../src/services/catalogService.ts");
    const { notifyBackendWrite } = require("../src/services/backendEvents.ts");
    const values = [],
      errors = [];
    stop = watchFollowedArtistSongs(
      "artist-a",
      (value) => values.push(value),
      (error) => errors.push(error),
    );
    requests.shift().resolve({ items: [{ id: "song-a" }], nextCursor: null });
    await tick();
    notifyBackendWrite("alice", "/following/artist-a");
    requests.shift().reject(denied());
    await tick();
    assert.deepEqual(values.at(-1), []);
    assert.equal(errors.length, 0);
    notifyBackendWrite("alice", "/following/artist-a");
    requests.shift().resolve({ items: [{ id: "song-a" }], nextCursor: null });
    await tick();
    assert.deepEqual(values.at(-1), [{ id: "song-a" }]);
    // A newer write supersedes an in-flight request. Its error must not poison
    // createKeyedSubscriptions before the queued refresh succeeds.
    notifyBackendWrite("alice", "/following/artist-a");
    const old = requests.shift();
    notifyBackendWrite("alice", "/following/artist-a");
    old.reject(new Error("stale network failure"));
    await tick();
    assert.equal(errors.length, 0);
    requests.shift().resolve({ items: [{ id: "fresh" }], nextCursor: null });
    await tick();
    assert.deepEqual(values.at(-1), [{ id: "fresh" }]);
    notifyBackendWrite("alice", "/following/artist-a");
    requests
      .shift()
      .reject(
        Object.assign(new Error("Tài khoản đã bị vô hiệu hóa."), {
          status: 403,
        }),
      );
    await tick();
    assert.equal(errors.length, 1);
    assert.match(errors[0].message, /vô hiệu hóa/);
    notifyBackendWrite("alice", "/following/artist-a");
    const late = requests.shift();
    stop();
    const count = values.length;
    late.reject(denied());
    await tick();
    assert.equal(values.length, count);
    assert.equal(errors.length, 1);
  } finally {
    stop?.();
    Module._load = load;
  }
});
