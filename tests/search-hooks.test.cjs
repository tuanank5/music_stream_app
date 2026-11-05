require("./helpers/register-local.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const React = require("react");
const { act } = React;
test("backend resource refresh rejects old responses and reloads after relation changes", async () => {
  const { Window } = await import("happy-dom");
  const window = new Window();
  global.window = window;
  global.document = window.document;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const Auth = React.createContext(null),
    requests = [];
  let captured;
  const load = Module._load;
  Module._load = function (request, parent, main) {
    if (request.endsWith("/AuthContext"))
      return { useAuth: () => React.useContext(Auth) };
    if (request.endsWith("/backendService"))
      return {
        backendGet: (path) =>
          new Promise((resolve) => requests.push({ path, resolve })),
      };
    return load.call(this, request, parent, main);
  };
  const { useBackendResource } = require("../src/hooks/useBackendResource.ts");
  const container = document.createElement("div");
  const root = require("react-dom/client").createRoot(container);
  function Capture({ relation }) {
    captured = useBackendResource("/profiles/artist", {}, relation);
    return null;
  }
  const render = (relation, uid = "alice") =>
    act(async () =>
      root.render(
        React.createElement(
          Auth.Provider,
          { value: { user: { uid } } },
          React.createElement(Capture, { relation }),
        ),
      ),
    );
  try {
    await render("false");
    await act(async () => requests[0].resolve({ followerCount: 1 }));
    assert.equal(captured.value.followerCount, 1);
    await act(async () => captured.refresh());
    assert.equal(requests.length, 2);
    await render("true");
    assert.equal(requests.length, 3);
    await act(async () => requests[1].resolve({ followerCount: 99 }));
    assert.equal(captured.value, undefined);
    await act(async () => requests[2].resolve({ followerCount: 2 }));
    assert.equal(captured.value.followerCount, 2);
    await render("true", "bob");
    assert.equal(captured.value, undefined);
    await act(async () => requests[3].resolve({ followerCount: 3 }));
    assert.equal(captured.value.followerCount, 3);
  } finally {
    await act(async () => root.unmount());
    Module._load = load;
    await window.happyDOM.close();
    delete global.window;
    delete global.document;
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});
test("real useSearch debounces, resets query/filter cursors and rejects old-account/old-query responses", async () => {
  const { Window } = await import("happy-dom");
  const window = new Window();
  global.window = window;
  global.document = window.document;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const Auth = React.createContext(null),
    requests = [];
  let captured;
  const load = Module._load;
  Module._load = function (request, parent, main) {
    if (request.endsWith("/AuthContext"))
      return { useAuth: () => React.useContext(Auth) };
    if (request.endsWith("/backendService"))
      return {
        backendGet: (path, params) =>
          new Promise((resolve, reject) =>
            requests.push({ path, params, resolve, reject }),
          ),
      };
    return load.call(this, request, parent, main);
  };
  const { useSearch } = require("../src/hooks/useSearch.ts");
  const container = document.createElement("div");
  document.body.append(container);
  const root = require("react-dom/client").createRoot(container);
  function Capture({ query, filter }) {
    captured = useSearch(query, filter);
    return null;
  }
  const render = async (query, filter = null, uid = "alice") =>
    act(async () =>
      root.render(
        React.createElement(
          Auth.Provider,
          { value: { user: { uid } } },
          React.createElement(Capture, { query, filter }),
        ),
      ),
    );
  const wait = async (ms) =>
    act(async () => new Promise((resolve) => setTimeout(resolve, ms)));
  try {
    await render("");
    await wait(350);
    assert.equal(requests.length, 0);
    await render("old");
    await wait(60);
    assert.equal(requests.length, 0);
    await wait(270);
    assert.equal(requests.length, 1);
    await render("new");
    await act(async () =>
      requests[0].resolve({
        items: [{ kind: "song", item: { id: "old" } }],
        hasMore: false,
        nextCursor: null,
      }),
    );
    assert.deepEqual(captured.items, []);
    await wait(330);
    assert.equal(requests.length, 2);
    assert.equal(requests[1].params.pageSize, "20");
    assert.equal(requests[1].params.cursor, undefined);
    await act(async () =>
      requests[1].resolve({
        items: [{ kind: "song", item: { id: "new" } }],
        hasMore: true,
        nextCursor: "cursor-new",
      }),
    );
    await act(async () => {
      void captured.loadMore();
      void captured.loadMore();
    });
    assert.equal(requests.length, 3);
    assert.equal(requests[2].params.pageSize, "10");
    assert.equal(requests[2].params.cursor, "cursor-new");
    await render("new", "albums", "bob");
    assert.deepEqual(captured.items, []);
    await act(async () =>
      requests[2].resolve({
        items: [{ kind: "song", item: { id: "alice-only" } }],
        hasMore: false,
        nextCursor: null,
      }),
    );
    await wait(330);
    assert.equal(requests[3].params.kind, "album");
    assert.equal(requests[3].params.cursor, undefined);
    await act(async () =>
      requests[3].resolve({
        items: [{ kind: "album", item: { id: "bob" } }],
        hasMore: false,
        nextCursor: null,
      }),
    );
    assert.deepEqual(
      captured.items.map((result) => result.item.id),
      ["bob"],
    );
  } finally {
    await act(async () => root.unmount());
    Module._load = load;
    container.remove();
    await window.happyDOM.close();
    delete global.window;
    delete global.document;
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});
