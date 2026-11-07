require("./helpers/register-local.cjs");
const { test, before, beforeEach, afterEach, after } = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const React = require("react");
const { act } = React;
const h = React.createElement;
const Auth = React.createContext(null);
const registrations = [];
const engines = [];
let root,
  container,
  window,
  Data,
  Player,
  FollowButton,
  seen,
  counts,
  loadSong,
  follow;
let AlbumFavorites, albumGet, albumDelete;

function subscribe(name, next, fail) {
  const entry = { name, next, fail, stopped: 0 };
  registrations.push(entry);
  return () => entry.stopped++;
}
function active(name) {
  return registrations
    .filter((item) => item.name === name && !item.stopped)
    .at(-1);
}
function emit(name, value) {
  const entry = active(name);
  assert.ok(entry, name);
  entry.next(value);
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function song(id, overrides = {}) {
  return {
    id,
    title: id,
    artistId: "artist",
    artist: "Artist",
    albumId: "album",
    album: "Album",
    active: true,

    isPublic: true,
    audioUrl: "https://example.test/audio.mp3",
    ...overrides,
  };
}

function fakeEngine() {
  let status = {
    currentTime: 0,
    duration: 0,
    playing: false,
    isLoaded: false,
    isBuffering: false,
    didJustFinish: false,
  };
  const listeners = new Set();
  const calls = [];
  const engine = {
    calls,
    released: false,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot: () => status,
    update: (patch) => {
      status = { ...status, ...patch };
      listeners.forEach((listener) => listener());
    },
    replace: (source) => {
      calls.push(["replace", source]);
      engine.update({
        currentTime: 0,
        duration: 180,
        isLoaded: true,
        didJustFinish: false,
      });
    },
    play: () => {
      calls.push(["play"]);
      engine.update({ playing: true });
    },
    pause: () => {
      calls.push(["pause"]);
      engine.update({ playing: false });
    },
    seekTo: async (position) => {
      calls.push(["seek", position]);
      engine.update({ currentTime: position });
    },
  };
  engines.push(engine);
  return engine;
}

const catalog = {
  watchSongs: (next, fail) => subscribe("songs", next, fail),
  watchArtists: (next, fail) => subscribe("artists", next, fail),
  watchAlbums: (next, fail) => subscribe("albums", next, fail),
  watchSong: (id, next, fail) => subscribe(`song:${id}`, next, fail),
  watchFollowedArtistSongs: (id, next, fail) =>
    subscribe(`followed:${id}`, next, fail),
  getReadableSong: (id) => loadSong(id),
};
const library = {
  watchHistory: (uid, next, fail) => subscribe(`history:${uid}`, next, fail),
  watchPlaylists: (uid, next, fail) =>
    subscribe(`playlists:${uid}`, next, fail),
  watchFavorites: (uid, next, fail) =>
    subscribe(`favorites:${uid}`, next, fail),
  watchFollowing: (uid, next, fail) =>
    subscribe(`following:${uid}`, next, fail),
  setFollow: (...args) => follow(...args),
};
const load = Module._load;
Module._load = function (request, parent, isMain) {
  if (parent?.filename.endsWith("AlbumFavoritesContext.tsx")) {
    if (request.endsWith("/backendService"))
      return {
        backendGet: (...args) => albumGet(...args),
        backendDelete: (...args) => albumDelete(...args),
        backendPut: async () => {
          throw Error("Unexpected album PUT");
        },
      };
    if (request.endsWith("/firebase"))
      return {
        getFirebaseAuth: () => ({ currentUser: { uid: "alice" } }),
      };
  }
  if (request.endsWith("/contexts/AuthContext") || request === "./AuthContext")
    return { useAuth: () => React.useContext(Auth) };
  if (request.endsWith("/services/catalogService")) return catalog;
  if (request.endsWith("/services/libraryService")) return library;
  if (request.endsWith("/hooks/usePlaybackHistory"))
    return { usePlaybackHistory: () => {} };
  if (request.endsWith("/services/firebase/config"))
    return {
      getFirebaseRuntime: () => ({
        mode: "emulator",
        backendUrl: "http://192.168.1.15:8787",
      }),
    };
  if (request === "expo-audio")
    return {
      setAudioModeAsync: async () => {},
      useAudioPlayer: () => {
        const [engine] = React.useState(fakeEngine);
        React.useEffect(
          () => () => {
            engine.released = true;
          },
          [engine],
        );
        return engine;
      },
      useAudioPlayerStatus: (engine) =>
        React.useSyncExternalStore(
          engine.subscribe,
          engine.snapshot,
          engine.snapshot,
        ),
    };
  if (request === "tamagui")
    return { YStack: ({ children }) => h("div", null, children) };
  if (request === "../ui/index")
    return {
      Action: ({ children, onPress, disabled, "aria-label": label }) =>
        h(
          "button",
          { onClick: onPress, disabled, "aria-label": label },
          children,
        ),
      AppText: ({ children }) => h("span", null, children),
      ErrorText: ({ message }) =>
        message ? h("p", { role: "alert" }, message) : null,
    };
  return load.call(this, request, parent, isMain);
};

before(async () => {
  const { Window } = await import("happy-dom");
  window = new Window({ url: "http://localhost" });
  global.window = window;
  global.document = window.document;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  Data = require("../src/contexts/DataContext.tsx");
  AlbumFavorites = require("../src/contexts/AlbumFavoritesContext.tsx");
  Player = require("../src/contexts/PlayerContext.tsx");
  ({ FollowButton } = require("../src/components/discovery/FollowButton.tsx"));
});
beforeEach(() => {
  registrations.length = 0;
  engines.length = 0;
  seen = {};
  counts = {};
  loadSong = async (id) => song(id);
  follow = async () => {};
  container = document.createElement("div");
  document.body.append(container);
  root = require("react-dom/client").createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});
after(async () => {
  Module._load = load;
  await window.happyDOM.close();
  delete global.window;
  delete global.document;
  delete global.IS_REACT_ACT_ENVIRONMENT;
});

const user = (uid) => ({
  user: uid ? { uid } : null,
  loading: false,
});
test("album favorites remain usable during refresh and ignore stale reads after a mutation", async () => {
  const initial = deferred(),
    refresh = deferred(),
    deletion = deferred();
  let reads = 0,
    deletes = 0;
  albumGet = () => (++reads === 1 ? initial.promise : refresh.promise);
  albumDelete = () => {
    deletes++;
    return deletion.promise;
  };
  await mount(
    h(
      AlbumFavorites.AlbumFavoritesProvider,
      null,
      h(Capture, {
        name: "albumFavorites",
        hook: AlbumFavorites.useAlbumFavorites,
      }),
    ),
  );
  assert.equal(seen.albumFavorites.ready, false);
  await act(async () =>
    initial.resolve({ albums: [{ id: "a" }, { id: "b" }] }),
  );
  assert.equal(seen.albumFavorites.ready, true);
  await act(async () => seen.albumFavorites.reload());
  assert.equal(seen.albumFavorites.loading, true);
  assert.equal(seen.albumFavorites.ready, true);
  let mutation;
  await act(async () => {
    mutation = seen.albumFavorites.toggle("a");
  });
  assert.equal(deletes, 1);
  await act(async () => seen.albumFavorites.toggle("a"));
  assert.equal(deletes, 1);
  await act(async () => {
    deletion.resolve();
    await mutation;
  });
  await act(async () =>
    refresh.resolve({ albums: [{ id: "a" }, { id: "b" }] }),
  );
  assert.deepEqual(
    seen.albumFavorites.albums.map((album) => album.id),
    ["b"],
  );
  assert.equal(seen.albumFavorites.loading, false);
  assert.equal(seen.albumFavorites.pending.size, 0);
});
async function mount(content, uid = "alice") {
  await act(async () =>
    root.render(h(Auth.Provider, { value: user(uid) }, content)),
  );
}
function Capture({ name, hook }) {
  seen[name] = hook();
  counts[name] = (counts[name] || 0) + 1;
  return null;
}
function dataTree(extra) {
  return h(
    Data.DataProvider,
    null,
    h(Capture, { name: "catalog", hook: Data.useCatalogData }),
    h(Capture, { name: "library", hook: Data.useLibraryData }),
    extra,
  );
}
async function readyData() {
  await act(async () => {
    emit("songs", [song("public")]);
    emit("artists", [{ id: "artist", name: "Artist" }]);
    emit("albums", [{ id: "album", title: "Album" }]);
    emit("favorites:alice", []);
    emit("following:alice", []);
    emit("playlists:alice", []);
  });
}

test("library updates do not render catalog consumers and the provider does not preload unused history", async () => {
  await mount(dataTree());
  await readyData();
  const rendered = counts.catalog,
    beforeSongs = seen.catalog.songs;
  assert.equal(
    registrations.some((item) => item.name.startsWith("history:")),
    false,
  );
  for (let i = 0; i < 10; i++)
    await act(async () =>
      emit("playlists:alice", [
        { id: "p", name: `Playlist ${i}`, songIds: ["public"] },
      ]),
    );
  assert.equal(counts.catalog, rendered);
  assert.equal(seen.catalog.songs, beforeSongs);
  assert.ok(counts.library > 10);
  await act(async () =>
    emit("playlists:alice", [{ id: "p", songIds: ["public"] }]),
  );
  assert.equal(counts.catalog, rendered);
  assert.equal(
    registrations.filter((item) => item.name === "song:public").length,
    0,
  );
});

test("catalog remains loading until its individual sources have settled", async () => {
  await mount(dataTree());
  await act(async () => emit("songs", []));
  assert.equal(seen.catalog.loadingSources.songs, false);
  assert.equal(seen.catalog.loading, true);
  await act(async () => {
    emit("artists", []);
    active("albums").fail(new Error("album unavailable"));
  });
  assert.equal(seen.catalog.loading, false);
  assert.match(seen.catalog.errors.join("\n"), /Albums: album unavailable/);
  await act(async () => emit("albums", []));
  assert.deepEqual(seen.catalog.errors, []);
});

test("linked and followed subscriptions retain unchanged IDs and discard removed/revoked data", async () => {
  await mount(dataTree());
  await readyData();
  await act(async () => {
    emit("favorites:alice", ["a"]);
    emit("following:alice", ["artist-a"]);
  });
  const a = active("song:a"),
    artistA = active("followed:artist-a");
  await act(async () => {
    a.next(song("a"));
    artistA.next([song("followers-a", { visibility: "followers" })]);
  });
  await act(async () => {
    emit("favorites:alice", ["a", "b"]);
    emit("following:alice", ["artist-a", "artist-b"]);
  });
  assert.equal(active("song:a"), a);
  assert.equal(active("followed:artist-a"), artistA);
  assert.equal(a.stopped, 0);
  assert.equal(artistA.stopped, 0);
  await act(async () => {
    active("song:b").next(song("b"));
    emit("favorites:alice", ["b"]);
    emit("following:alice", ["artist-b"]);
  });
  assert.equal(a.stopped, 1);
  assert.equal(artistA.stopped, 1);
  await act(async () => {
    a.next(song("a"));
    artistA.next([song("followers-a")]);
    active("song:b").fail(new Error("permission denied"));
  });
  assert.deepEqual(
    seen.catalog.songs.map((s) => s.id),
    ["public"],
  );
});

test("ensureSong coalesces simultaneous loads, reuses shared queries, and retries terminal listeners", async () => {
  await mount(dataTree());
  await readyData();
  const waiting = deferred();
  let reads = 0;
  loadSong = () => {
    reads++;
    return waiting.promise;
  };
  await seen.catalog.ensureSong("public");
  assert.equal(reads, 0);
  let first, second;
  await act(async () => {
    first = seen.catalog.ensureSong("detail");
    second = seen.catalog.ensureSong("detail");
    await Promise.resolve();
  });
  assert.equal(reads, 1);
  await act(async () => {
    waiting.resolve(song("detail"));
    await Promise.all([first, second]);
  });
  const listener = active("song:detail");
  assert.ok(listener);
  await act(async () => listener.fail(new Error("permission denied")));
  assert.ok(!seen.catalog.songs.some((s) => s.id === "detail"));
  loadSong = async () => {
    reads++;
    return song("detail");
  };
  await act(async () => {
    await seen.catalog.ensureSong("detail");
  });
  assert.equal(reads, 2);
  assert.equal(listener.stopped, 1);
  assert.notEqual(active("song:detail"), listener);
});

test("logout clears listeners and late detail responses cannot enter the next account", async () => {
  const content = dataTree();
  await mount(content);
  await readyData();
  const waiting = deferred();
  loadSong = () => waiting.promise;
  let request;
  await act(async () => {
    request = seen.catalog.ensureSong("old");
    await Promise.resolve();
  });
  const observed = request.catch((error) => error);
  const old = [...registrations];
  await mount(content, null);
  assert.ok(old.every((entry) => entry.stopped === 1));
  assert.deepEqual(seen.catalog.songs, []);
  assert.deepEqual(seen.library.favoriteIds, []);
  await mount(content, "bob");
  await act(async () => {
    old.find((item) => item.name === "songs").next([song("old")]);
    waiting.resolve(song("old"));
    await observed;
  });
  assert.match((await observed).message, /Phiên dữ liệu/);
  assert.deepEqual(seen.catalog.songs, []);
});

test("permission loss invalidates an in-flight detail load and ignores terminal listener callbacks", async () => {
  await mount(dataTree());
  await readyData();
  await act(async () => {
    await seen.catalog.ensureSong("detail");
  });
  const listener = active("song:detail");
  await act(async () => listener.next(song("detail")));
  const waiting = deferred();
  loadSong = () => waiting.promise;
  let request;
  await act(async () => {
    request = seen.catalog.ensureSong("detail").catch((error) => error);
    await Promise.resolve();
  });
  await act(async () => {
    listener.fail(new Error("permission denied"));
    listener.next(song("detail"));
  });
  await act(async () => {
    waiting.resolve(song("detail"));
    await request;
  });
  assert.match((await request).message, /quyền truy cập/);
  assert.ok(!seen.catalog.songs.some((item) => item.id === "detail"));
});

test("a stopped detail listener cannot invalidate a request belonging to its replacement", async () => {
  await mount(dataTree());
  await readyData();
  await act(async () => {
    await seen.catalog.ensureSong("detail");
  });
  const old = active("song:detail");
  await act(async () => emit("songs", [song("public"), song("detail")]));
  assert.equal(old.stopped, 1);
  await act(async () => emit("songs", [song("public")]));
  assert.notEqual(active("song:detail"), old);
  const waiting = deferred();
  loadSong = () => waiting.promise;
  let request;
  await act(async () => {
    request = seen.catalog.ensureSong("detail");
    await Promise.resolve();
  });
  await act(async () => {
    old.next(null);
    old.fail(new Error("old permission error"));
    waiting.resolve(song("detail"));
    await request;
  });
  assert.ok(seen.catalog.songs.some((item) => item.id === "detail"));
  assert.ok(
    !seen.catalog.errors.some((message) =>
      message.includes("old permission error"),
    ),
  );
});

test("one detail snapshot does not erase another loaded detail awaiting its first snapshot", async () => {
  await mount(dataTree());
  await readyData();
  await act(async () => {
    await Promise.all([
      seen.catalog.ensureSong("a"),
      seen.catalog.ensureSong("b"),
    ]);
  });
  await act(async () => active("song:a").next(song("a")));
  assert.ok(seen.catalog.songs.some((item) => item.id === "b"));
  await act(async () => active("song:b").next(null));
  assert.ok(!seen.catalog.songs.some((item) => item.id === "b"));
  assert.ok(seen.catalog.songs.some((item) => item.id === "a"));
});

test("StrictMode restart leaves one active subscription per source and rejects old generations", async () => {
  await act(async () =>
    root.render(
      h(
        React.StrictMode,
        null,
        h(Auth.Provider, { value: user("alice") }, dataTree()),
      ),
    ),
  );
  assert.equal(
    registrations.filter((item) => item.name === "songs" && !item.stopped)
      .length,
    1,
  );
  await readyData();
  const previous = registrations.find(
    (item) => item.name === "songs" && item.stopped,
  );
  assert.ok(previous);
  await act(async () => previous.next([song("stale")]));
  assert.deepEqual(
    seen.catalog.songs.map((item) => item.id),
    ["public"],
  );
});

test("FollowButton shows Unfollow, blocks duplicate clicks and preserves state after failure", async () => {
  const pending = deferred();
  const calls = [];
  follow = (...args) => {
    calls.push(args);
    return pending.promise;
  };
  await mount(dataTree(h(FollowButton, { artistId: "artist" })));
  await readyData();
  let button = container.querySelector("button");
  assert.equal(button.textContent, "Follow");
  await act(async () => {
    button.click();
    button.click();
  });
  assert.equal(button.disabled, true);
  assert.equal(calls.length, 1);
  await act(async () => {
    emit("following:alice", ["artist"]);
    pending.resolve();
    await pending.promise;
  });
  button = container.querySelector("button");
  assert.equal(button.textContent, "Unfollow");
  follow = async () => {
    throw new Error("network offline");
  };
  await act(async () => button.click());
  assert.equal(container.querySelector("button").textContent, "Unfollow");
  assert.match(
    container.querySelector('[role="alert"]').textContent,
    /network offline/,
  );
});

function playerTree() {
  return h(
    Player.PlayerProvider,
    null,
    h(Capture, { name: "actions", hook: Player.usePlayerActions }),
    h(Capture, { name: "state", hook: Player.usePlayerState }),
    h(Capture, { name: "progress", hook: Player.usePlayerProgress }),
  );
}

test("player loads local demo URLs through the configured backend and refuses missing audio instead of falling back", async () => {
  await mount(playerTree());
  const engine = engines[0];
  await act(async () =>
    seen.actions.play(
      song("demo", { audioUrl: "/local-audio/sample-short.wav" }),
    ),
  );
  assert.deepEqual(
    engine.calls.find(([name]) => name === "replace"),
    [
      "replace",
      { uri: "http://192.168.1.15:8787/local-audio/sample-short.wav" },
    ],
  );
  const count = engine.calls.length;
  await act(async () =>
    seen.actions.play(song("missing", { audioUrl: "", audioKey: "demo1" })),
  );
  assert.equal(engine.calls.length, count);
  assert.ok(seen.state.error);
  assert.equal(seen.state.current.id, "demo");
});

test("50 progress ticks render only the progress consumer and keep one engine/actions object", async () => {
  await mount(playerTree());
  await act(async () => seen.actions.play(song("a"), [song("a"), song("b")]));
  const actions = seen.actions,
    before = { ...counts },
    engine = engines[0];
  for (let i = 1; i <= 50; i++)
    await act(async () => engine.update({ currentTime: i }));
  assert.equal(counts.actions, before.actions);
  assert.equal(counts.state, before.state);
  assert.equal(counts.progress - before.progress, 50);
  assert.equal(seen.actions, actions);
  assert.equal(engines.length, 1);
  assert.equal(seen.progress.position, 50);
});

test("stable player actions use latest status for pause, seek, next/previous and repeat", async () => {
  await mount(playerTree());
  const actions = seen.actions,
    engine = engines[0];
  const a = song("a"),
    b = song("b");
  await act(async () => actions.play(a, [a, b]));
  await act(async () => actions.toggle());
  assert.equal(seen.state.playing, false);
  await act(async () => actions.toggle());
  assert.equal(seen.state.playing, true);
  await act(async () => engine.update({ duration: 90, currentTime: 20 }));
  await act(async () => actions.seek(999));
  assert.equal(seen.progress.position, 90);
  await act(async () => actions.next());
  assert.equal(seen.state.current.id, "b");
  await act(async () => actions.previous());
  assert.equal(seen.state.current.id, "a");
  await act(async () => actions.setRepeat(true));
  await act(async () => engine.update({ didJustFinish: true }));
  assert.equal(seen.state.current.id, "a");
  await act(async () => actions.setRepeat(false));
  await act(async () => engine.update({ didJustFinish: true }));
  assert.equal(seen.state.current.id, "b");
  assert.equal(seen.actions, actions);
});

test("repeat-all wraps the queue including a single song; normal playback stops at its end", async () => {
  await mount(playerTree());
  const actions = seen.actions,
    engine = engines[0];
  const a = song("a"),
    b = song("b");
  await act(async () => actions.play(b, [a, b]));
  const calls = engine.calls.length;
  await act(async () => engine.update({ didJustFinish: true }));
  assert.equal(seen.state.current.id, "b");
  assert.equal(engine.calls.length, calls);
  await act(async () => engine.update({ didJustFinish: false }));
  await act(async () => actions.setRepeatAll(true));
  await act(async () => engine.update({ didJustFinish: true }));
  assert.equal(seen.state.current.id, "a");
  await act(async () => actions.play(a, [a]));
  const singleCalls = engine.calls.length;
  await act(async () => engine.update({ didJustFinish: true }));
  assert.ok(engine.calls.length > singleCalls);
  assert.equal(seen.state.current.id, "a");
  assert.equal(seen.actions, actions);
});

test("removing current song clears playback and prevents it from remaining in the queue", async () => {
  await mount(playerTree());
  const a = song("a"),
    b = song("b");
  await act(async () => seen.actions.play(a, [a, b]));
  await act(async () => seen.actions.removeSong("a"));
  assert.equal(seen.state.current, null);
  await act(async () => seen.actions.next());
  assert.equal(seen.state.current.id, "b");
});

test("logout releases the old engine; captured actions cannot play into the new account", async () => {
  const content = playerTree();
  await mount(content);
  const actions = seen.actions,
    engine = engines[0];
  await act(async () => actions.play(song("a")));
  await mount(content, null);
  assert.equal(engine.released, true);
  assert.equal(seen.state.current, null);
  const calls = engine.calls.length;
  await act(async () => {
    actions.play(song("a"));
    actions.toggle();
    await actions.seek(10);
  });
  assert.equal(engine.calls.length, calls);
  assert.equal(seen.state.current, null);
});
