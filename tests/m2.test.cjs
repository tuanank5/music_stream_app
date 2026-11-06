require("./helpers/register-local.cjs");
const { test, before, beforeEach, afterEach, after } = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const React = require("react");
const { act } = React;
const h = React.createElement;
const reloadFavorites = () => {};
const { createSearchHistoryService } = require("../src/utils/searchHistory.ts");
function storage() {
  const values = new Map();
  return {
    values,
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      values.set(key, value);
    },
  };
}
const item = (id, kind = "song") => ({
  id,
  kind,
  title: id,
  subtitle: "Artist",
});
const key = (uid) => `search-history:v1:${uid}`;

test("local history serializes rapid mutations across screens, dedupes by kind/id, caps 20 and reloads", async () => {
  const disk = storage();
  const service = createSearchHistoryService(disk);
  const a = service.session("alice"),
    b = service.session("alice");
  await Promise.all(
    Array.from({ length: 25 }, (_, i) => (i % 2 ? a : b).add(item(`${i}`))),
  );
  await a.add({ ...item("10"), audioUrl: "private", token: "secret" });
  await a.add(item("10", "album"));
  await b.load();
  assert.equal(b.getSnapshot().items.length, 20);
  assert.deepEqual(
    b
      .getSnapshot()
      .items.slice(0, 2)
      .map((x) => [x.kind, x.id]),
    [
      ["album", "10"],
      ["song", "10"],
    ],
  );
  assert.doesNotMatch(
    disk.values.get(key("alice")),
    /private|secret|audioUrl|token/,
  );
  await Promise.all([
    a.remove(item("10")),
    b.add(item("new")),
    a.clear(),
    b.add(item("last")),
  ]);
  const remount = createSearchHistoryService(disk).session("alice");
  await remount.load();
  assert.deepEqual(remount.getSnapshot().items, [item("last")]);
  const other = service.session("bob");
  await other.load();
  assert.deepEqual(other.getSnapshot().items, []);
});

test("corrupt JSON recovers; read/write failures surface and the queue can retry", async () => {
  const disk = storage();
  disk.values.set(key("alice"), "{broken");
  const service = createSearchHistoryService(disk);
  const session = service.session("alice");
  await session.load();
  assert.deepEqual(session.getSnapshot().items, []);
  assert.equal(disk.values.get(key("alice")), "[]");
  const save = disk.setItem;
  disk.setItem = async () => {
    throw Error("disk full");
  };
  await session.add(item("failed"));
  assert.ok(session.getSnapshot().error);
  disk.setItem = save;
  await session.add(item("ok"));
  assert.equal(session.getSnapshot().error, "");
  const read = disk.getItem;
  disk.getItem = async () => {
    throw Error("unavailable");
  };
  await session.clear();
  assert.ok(session.getSnapshot().error);
  disk.getItem = read;
  await session.load();
  assert.deepEqual(session.getSnapshot().items, [item("ok")]);
});

let disk,
  service,
  uid,
  data,
  history,
  window,
  root,
  container,
  Search,
  Library,
  History,
  validate;
const routes = [];
const load = Module._load;
const router = {
  push: (path) => routes.push(path),
  canDismiss: () => true,
  dismiss: () => routes.push("back"),
};
const passthrough = ({ children }) => h("div", null, children);
const Button = ({ title, onPress, disabled }) =>
  h("button", { onClick: onPress, disabled }, title);
const IconButton = ({ children, onPress, ...props }) =>
  h(
    "button",
    { onClick: onPress, "aria-label": props["aria-label"] },
    children,
  );
const UI = {
  AppText: passthrough,
  AppIcon: () => "×",
  Button,
  IconButton,
  ErrorText: ({ message }) =>
    message ? h("div", { role: "alert" }, message) : null,
  Loading: () => h("div", null, "Loading"),
  EmptyState: ({ message }) => h("p", null, message),
  SearchField: ({ value, onChange }) =>
    h("input", { value, onInput: (event) => onChange(event.target.value) }),
  FilterBar: ({ options, value, onChange }) =>
    h(
      "div",
      null,
      options.map((option) =>
        h(
          "button",
          {
            key: option.value,
            "aria-pressed": value === option.value,
            onClick: () => onChange(option.value),
          },
          option.label,
        ),
      ),
    ),
  ListPage: ({
    title,
    titleLeading,
    titleTrailing,
    data,
    header,
    footer,
    renderItem,
  }) =>
    h(
      "main",
      null,
      h("h1", null, title),
      titleLeading,
      titleTrailing,
      header,
      data.map((item, index) =>
        h("div", { key: index }, renderItem(item, index)),
      ),
      footer,
    ),
  ModalPanel: passthrough,
};
before(async () => {
  const { Window } = await import("happy-dom");
  window = new Window();
  global.window = window;
  global.document = window.document;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  Module._load = function (request, parent, main) {
    if (request === "expo-router")
      return {
        router,
        useRouter: () => router,
        useFocusEffect: (callback) => React.useEffect(callback, [callback]),
      };
    if (request.endsWith("/AuthContext"))
      return { useAuth: () => ({ user: { uid } }) };
    if (request.endsWith("/AlbumFavoritesContext"))
      return {
        useAlbumFavorites: () => ({
          albums: data.favoriteAlbums || [],
          loading: false,
          error: "",
          pending: new Set(),
          toggle: async () => {},
          reload: reloadFavorites,
        }),
      };
    if (request === "../components/AlbumFavoriteButton")
      return { __esModule: true, default: () => null };
    if (request.endsWith("/DataContext"))
      return {
        useCatalogData: () => data,
        useData: () => data,
      };
    if (request.endsWith("/useSearch"))
      return {
        useSearch: (query, tab) => {
          const q = query.trim().toLowerCase();
          const candidates = [
            ...data.songs.map((item) => ({ kind: "song", item })),
            ...data.albums.map((item) => ({ kind: "album", item })),
            ...data.artists.map((item) => ({ kind: "artist", item })),
            ...(data.users ?? []).map((item) => ({ kind: "user", item })),
          ];
          const items = q
            ? candidates
                .filter(
                  (result) =>
                    (result.item.title || result.item.name || "")
                      .toLowerCase()
                      .includes(q) ||
                    (result.item.artist || result.item.artistName || "")
                      .toLowerCase()
                      .includes(q),
                )
                .filter(
                  (result) =>
                    !tab ||
                    result.kind ===
                      { tracks: "song", albums: "album", artists: "artist" }[
                        tab
                      ],
                )
            : [];
          return {
            items,
            loading: false,
            started: true,
            error: "",
            hasMore: false,
            loadMore: async () => {},
          };
        },
      };
    if (request.endsWith("/useHistoryPage"))
      return {
        useHistoryPage: () => {
          const seen = new Set();
          const items = [...history.history]
            .sort((a, b) => b.playedAt - a.playedAt)
            .flatMap((entry) => {
              if (seen.has(entry.songId)) return [];
              seen.add(entry.songId);
              const song = data.songs.find((song) => song.id === entry.songId);
              return song ? [{ song, entry }] : [];
            });
          return {
            items,
            loading: false,
            started: true,
            error: "",
            hasMore: false,
            loadMore: async () => {},
          };
        },
      };
    if (request.endsWith("/searchHistoryService"))
      return { searchHistoryService: { session: (id) => service.session(id) } };
    if (request.endsWith("/searchHistoryAccess"))
      return { validateSearchHistoryItem: (...args) => validate(...args) };
    if (request.endsWith("/libraryService")) return {};
    if (request === "tamagui")
      return { XStack: passthrough, YStack: passthrough };
    if (request.endsWith("/ui/index")) return UI;
    if (request === "../components/Artwork")
      return { __esModule: true, default: () => null };
    if (request === "../components/SongRow")
      return {
        __esModule: true,
        default: ({ song, queue, onOpen }) =>
          h(
            "button",
            {
              "data-queue": queue.map((x) => x.id).join(","),
              onClick: () => {
                onOpen?.();
                router.push("/player");
              },
            },
            song.title,
          ),
      };
    if (request === "../components/MediaRow")
      return {
        MediaRow: ({ title, subtitle, onPress, trailing }) =>
          h(
            "section",
            null,
            h("button", { onClick: onPress }, title, " ", subtitle),
            trailing,
          ),
      };
    if (
      [
        "../components/discovery/ArtistAvatar",
        "../components/discovery/FollowButton",
        "../components/ui/BackButton",
      ].includes(request)
    )
      return {
        ArtistAvatar: () => null,
        FollowButton: () => null,
        BackButton: ({ fallback }) => {
          const go =
            require("../src/hooks/useBackNavigation.ts").useBackNavigation(
              fallback,
            );
          return h("button", { onClick: go }, "Back");
        },
      };
    return load.call(this, request, parent, main);
  };
  Search = require("../src/screens/SearchScreen.tsx").default;
  Library = require("../src/screens/LibraryScreen.tsx").LibraryScreen;
  History = require("../src/screens/HistoryScreen.tsx").default;
});
beforeEach(() => {
  disk = storage();
  service = createSearchHistoryService(disk);
  uid = "alice";
  routes.length = 0;
  data = {
    songs: [{ id: "s", title: "Song", artist: "Artist", active: true }],
    artists: [{ id: "a", name: "Artist", active: true }],
    albums: [
      { id: "b", title: "Album", artistName: "Artist", isPublished: true },
    ],
    favoriteIds: ["s"],
    followingIds: ["a"],
    playlists: [{ id: "p", name: "Hidden playlist", songIds: [] }],
    loading: false,
  };
  history = { history: [], loading: false, error: "" };
  validate = async () => true;
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
async function mount(Component) {
  await act(async () => root.render(h(Component)));
}
async function click(text) {
  const button = [...container.querySelectorAll("button")].find(
    (node) => node.textContent === text,
  );
  assert.ok(button, text);
  await act(async () => button.click());
}
async function type(text) {
  await act(async () => {
    const input = container.querySelector("input");
    input.value = text;
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
}

test("Search records opened results only, toggles filters, and renders removable three-kind history", async () => {
  await mount(Search);
  assert.ok(container.textContent.includes("Tìm kiếm gần đây"));
  assert.equal(container.querySelectorAll("section").length, 0);
  assert.ok(!container.textContent.includes("Tất cả"));
  await type("Artist");
  assert.equal(disk.values.size, 0);
  await click("Bài hát");
  assert.equal(
    container.querySelector('[aria-pressed="true"]').textContent,
    "Bài hát",
  );
  assert.equal(container.querySelectorAll("section").length, 0);
  await click("Bài hát");
  assert.equal(container.querySelector('[aria-pressed="true"]'), null);
  await click("Song");
  await click("Album Album · Artist");
  await click("Artist Nghệ sĩ · 0 người theo dõi");
  await type("   ");
  assert.equal(container.querySelectorAll("section").length, 3);
  assert.ok(container.textContent.includes("Bài hát · Artist"));
  assert.ok(container.textContent.includes("Album · Artist"));
  const before = routes.length;
  await act(async () =>
    container
      .querySelector('[aria-label="Xóa Song khỏi tìm kiếm gần đây"]')
      .click(),
  );
  assert.equal(routes.length, before);
  assert.equal(container.querySelectorAll("section").length, 2);
  await click("Xóa tất cả");
  assert.equal(container.querySelectorAll("section").length, 0);
  assert.ok(
    ![...container.querySelectorAll("button")].some(
      (x) => x.textContent === "Xóa tất cả",
    ),
  );
  await type("Artist");
  assert.equal(container.querySelector('[aria-pressed="true"]'), null);
});

test("Search labels ordinary users, opens public profile and does not add a fourth local history kind", async () => {
  data.users = [{ id: "listener", name: "Listener", active: true }];
  await mount(Search);
  await type("Listener");
  await click("Listener Người dùng");
  assert.equal(routes[0].pathname, "/user");
  await type("");
  assert.equal(container.querySelectorAll("section").length, 0);
});

test("Search rejects unavailable history and ignores pending reopens after account switch", async () => {
  await service.session(uid).add(item("cached"));
  await mount(Search);
  validate = async () => false;
  await click("cached Bài hát · Artist");
  assert.equal(routes.length, 0);
  assert.ok(container.textContent.includes("không còn khả dụng"));
  let resolve;
  validate = () =>
    new Promise((yes) => {
      resolve = yes;
    });
  await click("cached Bài hát · Artist");
  uid = "bob";
  await mount(Search);
  assert.ok(!container.textContent.includes("cached"));
  await act(async () => resolve(true));
  assert.equal(routes.length, 0);
  assert.equal(disk.values.has(key("bob")), false);
});

test("late storage reads cannot populate another account and storage failures do not block opening results", async () => {
  let resolve;
  const read = disk.getItem;
  disk.getItem = (id) =>
    id === key("alice")
      ? new Promise((yes) => {
          resolve = yes;
        })
      : read(id);
  await mount(Search);
  uid = "bob";
  await mount(Search);
  await act(async () => resolve(JSON.stringify([item("old-account")])));
  assert.ok(!container.textContent.includes("old-account"));
  disk.setItem = async () => {
    throw Error("disk full");
  };
  await type("Song");
  await click("Song");
  assert.deepEqual(routes, ["/player"]);
  await type("");
  assert.ok(container.textContent.includes("Không thể đọc/lưu"));
});

test("Library includes favorite albums, excludes playlists, filters toggle, and History has guarded Back without search", async () => {
  data.favoriteAlbums = [
    { id: "favorite-album", title: "Favorite Album", artistName: "Artist" },
  ];
  await mount(Library);
  assert.ok(container.textContent.includes("Song"));
  assert.ok(container.textContent.includes("Favorite Album"));
  assert.ok(!container.textContent.includes("Hidden playlist"));
  assert.ok(!container.textContent.includes("Tất cả"));
  assert.ok(!container.textContent.includes("Yêu thích"));
  await click("Bài hát");
  assert.ok(!container.textContent.includes("Favorite Album"));
  await click("Bài hát");
  assert.equal(container.querySelector('[aria-pressed="true"]'), null);
  await click("Lịch sử");
  assert.deepEqual(routes, ["/history"]);
  history.history = [
    { id: "new", songId: "s", playedAt: 20, completed: true },
    { id: "old", songId: "s", playedAt: 10 },
    { id: "gone", songId: "missing", playedAt: 30 },
  ];
  await mount(History);
  assert.equal(container.querySelector("input"), null);
  assert.equal(container.querySelectorAll("[data-queue]").length, 1);
  assert.equal(
    container.querySelector("[data-queue]").getAttribute("data-queue"),
    "s",
  );
  await click("Back");
  await click("Back");
  assert.deepEqual(routes, ["/history", "back"]);
  await mount(Library);
  assert.ok(container.textContent.includes("Song"));
});
