const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const h = React.createElement;

function harness(file) {
  let state = { user: null, loading: false },
    button,
    redirect;
  const routes = [];
  const filename = require.resolve(file);
  const mod = new Module(filename, module);
  mod.require = (request) => {
    if (request.endsWith("/contexts/AuthContext"))
      return { useAuth: () => state };
    if (request === "expo-router")
      return {
        router: { replace: (route) => routes.push(route) },
        Redirect: ({ href }) => {
          redirect = href;
          return null;
        },
      };
    if (request.endsWith("/ui/index"))
      return {
        Page: ({ title, children }) =>
          h("main", null, h("h1", null, title), children),
        AppText: ({ children }) => h("p", null, children),
        Loading: () => h("p", null, "Loading"),
        Button: (props) => {
          button = props;
          return h("button", { disabled: props.disabled }, props.title);
        },
      };
    return require(request);
  };
  mod._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText,
    filename,
  );
  return {
    routes,
    render: (next, children) => {
      state = next;
      redirect = undefined;
      return renderToStaticMarkup(h(mod.exports.default, null, children));
    },
    button: () => button,
    redirect: () => redirect,
  };
}

test("NotFoundScreen stays accessible and returns guests/users to the correct destination", () => {
  const screen = harness("../src/screens/NotFoundScreen.tsx");
  assert.match(
    screen.render({ user: null, loading: false }),
    /Không tìm thấy trang/,
  );
  screen.button().onPress();
  assert.deepEqual(screen.routes, ["/"]);
  screen.render({ user: { uid: "alice" }, loading: false });
  screen.button().onPress();
  assert.deepEqual(screen.routes, ["/", "/home"]);
  screen.render({ user: null, loading: true });
  assert.equal(screen.button().disabled, true);
});

test("RequireAuth waits for restoration, redirects guests, and renders authenticated children", () => {
  const guard = harness("../src/components/RequireAuth.tsx");
  assert.match(guard.render({ user: null, loading: true }), /Loading/);
  assert.equal(guard.redirect(), undefined);
  guard.render({ user: null, loading: false });
  assert.equal(guard.redirect(), "/");
  assert.match(
    guard.render(
      { user: { uid: "alice" }, loading: false },
      h("p", null, "Private screen"),
    ),
    /Private screen/,
  );
  assert.equal(guard.redirect(), undefined);
});
