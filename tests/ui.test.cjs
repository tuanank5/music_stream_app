const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");

// Render the real UI modules with the web adapter, without a Metro/browser process.
const load = Module._load;
Module._load = function (request, parent, isMain) {
  return load.call(
    this,
    request === "react-native" ? "react-native-web" : request,
    parent,
    isMain,
  );
};
for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = (module, filename) => {
    const { outputText } = ts.transpileModule(
      fs.readFileSync(filename, "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          jsx: ts.JsxEmit.ReactJSX,
          esModuleInterop: true,
        },
      },
    );
    module._compile(outputText, filename);
  };
}
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { TamaguiProvider } = require("tamagui");
const { tamaguiConfig } = require("../tamagui.config.ts");
const { Field } = require("../src/components/ui/Field.tsx");
const { Button } = require("../src/components/ui/Button.tsx");
const { Page } = require("../src/components/ui/Page.tsx");
const { ListPage } = require("../src/components/ui/ListPage.tsx");
const { AppImage } = require("../src/components/ui/Image.tsx");
const { AppText } = require("../src/components/ui/Typography.tsx");
const { ErrorText } = require("../src/components/ui/Feedback.tsx");
const { FilterBar } = require("../src/components/ui/FilterBar.tsx");
const h = React.createElement;
const noop = () => {};
function render(child) {
  const html = renderToStaticMarkup(
    h(TamaguiProvider, { config: tamaguiConfig, defaultTheme: "light" }, child),
  );
  return { html, body: html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, "") };
}

test("fields retain password privacy, email autofill and multiline semantics on web", () => {
  const { body } = render(
    h(
      React.Fragment,
      null,
      h(Field, {
        label: "Email",
        value: "",
        onChange: noop,
        keyboardType: "email-address",
        autoComplete: "email",
      }),
      h(Field, {
        label: "Password",
        value: "secret",
        onChange: noop,
        secure: true,
        autoComplete: "current-password",
      }),
      h(Field, {
        label: "Notes",
        value: "text",
        onChange: noop,
        multiline: true,
      }),
    ),
  );
  assert.match(body, /type="email"/);
  assert.match(body, /type="password"/);
  assert.match(body, /auto[Cc]omplete="current-password"/);
  assert.match(body, /<textarea/);
  assert.match(body, /aria-label="Password"/);
});

test("disabled fields retain browser semantics without leaking native editable props", () => {
  const { body } = render(
    h(Field, {
      label: "Locked email",
      value: "user@example.com",
      onChange: noop,
      disabled: true,
      keyboardType: "email-address",
    }),
  );
  assert.match(body, /disabled/);
  assert.match(body, /aria-label="Locked email"/);
  assert.doesNotMatch(body, /editable=|accessibilityState/);
});

test("busy actions are disabled and errors announce their content", () => {
  const { body } = render(
    h(
      React.Fragment,
      null,
      h(Button, { title: "Save", loading: true, onPress: noop }),
      h(ErrorText, { message: "Upload failed" }),
    ),
  );
  assert.match(body, /disabled/);
  assert.match(body, /aria-busy="true"/);
  assert.match(body, /role="alert"/);
  assert.match(body, /Upload failed/);
  assert.doesNotMatch(body, /accessibilityLabel|accessibilityRole/);
});

test("bundled and remote image sources produce usable web URLs", () => {
  const { body, html } = render(
    h(
      React.Fragment,
      null,
      h(AppImage, {
        source: { uri: "/assets/welcome.png" },
        resizeMode: "center",
        width: 100,
        height: 100,
      }),
      h(AppImage, {
        source: { uri: "https://example.com/cover.jpg" },
        width: 40,
        height: 40,
      }),
    ),
  );
  assert.match(body, /src="\/assets\/welcome.png"/);
  assert.match(body, /src="https:\/\/example.com\/cover.jpg"/);
  assert.match(html, /scale-down/);
});

test("image accessibility labels become alt text without leaking native props into the DOM", () => {
  const { body } = render(
    h(
      React.Fragment,
      null,
      h(AppImage, {
        source: { uri: "/logo.png" },
        accessibilityLabel: "Music logo",
      }),
      h(AppImage, {
        source: { uri: "/cover.png" },
        accessibilityLabel: "Native label",
        alt: "Cover artwork",
      }),
    ),
  );
  assert.match(body, /alt="Music logo"/);
  assert.match(body, /alt="Cover artwork"/);
  assert.doesNotMatch(
    body,
    /accessibilityLabel|accessibilitylabel|Native label/,
  );
});

test("filter controls expose ARIA state without leaking native accessibilityState", () => {
  const { body } = render(
    h(FilterBar, {
      options: [
        { value: "songs", label: "Bài hát" },
        { value: "albums", label: "Album" },
      ],
      value: "songs",
      onChange: noop,
    }),
  );
  assert.match(body, /aria-pressed="true"/);
  assert.match(body, /aria-pressed="false"/);
  assert.doesNotMatch(body, /accessibilityState|accessibilitystate/);
});

test("Player renders normal, error and demo states without raw text nodes in layout views", () => {
  // Isolate platform/audio dependencies, but render the actual Player layout
  // and Tamagui components so their text-node diagnostics remain active.
  const player = {
    current: {
      id: "track-1",
      title: "A long track title",
      artist: "Artist name",
      cover: "",
      audioKey: "",
      audioUrl: "https://example.com/track.mp3",
    },
    playing: false,
    loading: false,
    error: "",
    repeat: false,
    position: 10,
    duration: 180,
    seek: async () => {},
    toggle: noop,
    play: noop,
    previous: noop,
    next: noop,
    setRepeat: noop,
  };
  const currentLoader = Module._load;
  const currentError = console.error;
  const diagnostics = [];
  let PlayerScreen;
  try {
    Module._load = function (request, parent, isMain) {
      if (request === "expo-router")
        return {
          useFocusEffect: noop,
          useRouter: () => ({
            canDismiss: () => true,
            dismiss: noop,
            replace: noop,
          }),
          router: {
            push: noop,
            replace: noop,
            back: noop,
            canGoBack: () => true,
          },
        };
      if (request === "expo-linear-gradient")
        return { LinearGradient: ({ children }) => h("div", null, children) };
      if (request === "react-native-safe-area-context")
        return {
          useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
        };
      if (request.endsWith("/contexts/PlayerContext"))
        return { usePlayer: () => player };
      if (request.endsWith("/contexts/AuthContext"))
        return { useAuth: () => ({ user: { uid: "user-1" } }) };
      if (request.endsWith("/contexts/DataContext"))
        return { useData: () => ({ favoriteIds: [] }) };
      if (request.endsWith("/services/libraryService"))
        return { setFavorite: async () => {} };
      if (request === "lucide-react-native")
        return new Proxy(
          {},
          { get: () => () => h("svg", { "aria-hidden": true }) },
        );
      return currentLoader.call(this, request, parent, isMain);
    };
    PlayerScreen = require("../src/components/PlayerScreen.tsx").default;
    console.error = (...args) => {
      diagnostics.push(args);
    };
    assert.match(render(h(PlayerScreen)).body, /A long track title/);
    player.error = "Audio unavailable";
    assert.match(render(h(PlayerScreen)).body, /Thử tải lại bài hát/);
    player.error = "";
    player.current.audioKey = "demo1";
    player.current.audioUrl = "";
    assert.match(render(h(PlayerScreen)).body, /không phải bản thu thương mại/);
    assert.equal(
      diagnostics.some((args) =>
        String(args[0]).includes("Unexpected text node"),
      ),
      false,
    );
  } finally {
    Module._load = currentLoader;
    console.error = currentError;
    delete require.cache[require.resolve("../src/components/PlayerScreen.tsx")];
  }
});

test("form pages constrain width and list pages initially mount a bounded set of rows", () => {
  const form = render(
    h(
      Page,
      { title: "Login", contentWidth: "form" },
      h(AppText, null, "Form content"),
    ),
  );
  assert.match(form.html, /480px/);
  const items = Array.from({ length: 100 }, (_, index) => ({
    id: String(index),
  }));
  const list = render(
    h(ListPage, {
      title: "Songs",
      data: items,
      keyExtractor: (item) => item.id,
      renderItem: (item) => h(AppText, null, `row-${item.id}-end`),
    }),
  );
  assert.match(list.body, /row-0-end/);
  assert.doesNotMatch(list.body, /row-99-end/);
});
