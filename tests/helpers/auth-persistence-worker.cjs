// Exercise the actual Firebase SDK browser/RN persistence implementations against
// Auth Emulator. The RN storage adapter is simulated; this is not an Android UI test.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
async function main() {
  const platform = process.argv[2];
  assert.ok(["web", "android"].includes(platform));
  assert.ok(process.env.FIREBASE_AUTH_EMULATOR_HOST);
  const { initializeApp, deleteApp } = require("firebase/app");
  let window;
  const disk = new Map();
  const storage = {
    getItem: async (key) => disk.get(key) ?? null,
    setItem: async (key, value) => {
      disk.set(key, value);
    },
    removeItem: async (key) => {
      disk.delete(key);
    },
  };
  if (platform === "web") {
    const { Window } = await import("happy-dom");
    window = new Window({ url: "http://localhost" });
    global.window = window;
    global.document = window.document;
    global.self = window;
    global.localStorage = window.localStorage;
  }
  const manifest = require.resolve("@firebase/auth/package.json");
  const sdkExports = JSON.parse(fs.readFileSync(manifest, "utf8")).exports["."];
  const sdk = require(
    path.resolve(
      path.dirname(manifest),
      platform === "web"
        ? sdkExports.browser.require
        : sdkExports["react-native"].default,
    ),
  );
  const config = {
    apiKey: "demo-local-api-key",
    projectId: "demo-music-stream",
    authDomain: "demo-music-stream.firebaseapp.com",
  };
  const name = `persistence-${platform}-${process.pid}`;
  const email = `${name}@example.test`,
    password = "LocalMusic123!";
  let app, uid;
  const reload = () => {
    app = initializeApp(config, name);
    const filename = path.resolve(
      __dirname,
      platform === "web"
        ? "../../src/services/firebase/auth.ts"
        : "../../src/services/firebase/auth.native.ts",
    );
    const mod = new Module(filename, module);
    mod.filename = filename;
    mod.require = (request) => {
      if (request === "./config")
        return { isFirebaseConfigured: () => true, getFirebaseApp: () => app };
      if (request === "firebase/auth") return sdk;
      if (request === "@react-native-async-storage/async-storage")
        return { __esModule: true, default: storage };
      if (request === "./emulators")
        return {
          connectLocalAuth: (auth) => {
            if (!auth.emulatorConfig)
              sdk.connectAuthEmulator(
                auth,
                `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`,
                { disableWarnings: true },
              );
          },
        };
      throw Error(`Unexpected dependency ${request}`);
    };
    mod._compile(
      ts.transpileModule(fs.readFileSync(filename, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          esModuleInterop: true,
        },
      }).outputText,
      filename,
    );
    const auth = mod.exports.getFirebaseAuth();
    assert.equal(mod.exports.getFirebaseAuth(), auth);
    return auth;
  };
  try {
    let auth = reload();
    await auth.authStateReady();
    uid = (await sdk.createUserWithEmailAndPassword(auth, email, password)).user
      .uid;
    await sdk.signOut(auth);
    assert.equal(auth.currentUser, null);
    await sdk.signInWithEmailAndPassword(auth, email, password);
    assert.equal(auth.currentUser.uid, uid);
    const stored =
      platform === "web"
        ? Array.from({ length: window.localStorage.length }, (_, i) =>
            window.localStorage.getItem(window.localStorage.key(i)),
          )
        : [...disk.values()];
    assert.ok(
      stored.some((value) => value.includes(uid)),
      "SDK must persist the signed-in account",
    );
    await deleteApp(app);
    app = null;
    auth = reload();
    await auth.authStateReady();
    assert.equal(
      auth.currentUser?.uid,
      uid,
      "account must restore after destroying/recreating app and source singleton",
    );
    await sdk.signOut(auth);
    await deleteApp(app);
    app = null;
    auth = reload();
    await auth.authStateReady();
    assert.equal(
      auth.currentUser,
      null,
      "sign-out must survive app recreation",
    );
    console.log(
      `PASS ${platform}: sign-in, persisted app recreation, sign-out, signed-out app recreation`,
    );
  } finally {
    if (app) await deleteApp(app);
    if (uid) {
      const { app: adminApp, auth } =
        require("../../tools/local/environment.cjs").configureLocalAdmin();
      try {
        await auth.deleteUser(uid);
      } finally {
        await require("node:module")
          .createRequire(require.resolve("../../tools/package.json"))(
            "firebase-admin/app",
          )
          .deleteApp(adminApp);
      }
    }
    if (window) await window.happyDOM.close();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
