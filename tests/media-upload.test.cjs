const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

function compile(filename, requireModule) {
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.require = requireModule;
  mod._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    filename,
  );
  return mod.exports;
}
const expoRoot = path.dirname(require.resolve("expo/package.json"));
const { convertFormDataAsync } = compile(
  path.join(expoRoot, "src/winter/fetch/convertFormData.ts"),
  () => ({
    blobToArrayBufferAsync: (blob) => blob.arrayBuffer(),
  }),
);
const { installFormDataPatch } = compile(
  path.join(expoRoot, "src/winter/FormData.ts"),
  require,
);
class RNFormData {
  constructor() {
    this._parts = [];
  }
}
const NativeFormData = installFormDataPatch(RNFormData);

test("audio staging cleans partial copies and rejects oversized or unreadable selections", async () => {
  for (const denied of [false, true]) {
    let deleted = 0;
    class FakeFile {
      constructor(...parts) {
        this.uri = parts.join("/");
        this.exists = false;
      }
      async copy(target) {
        target.exists = true;
        if (denied) throw Error("Missing READ permission");
      }
      get size() {
        return 31 * 1024 * 1024;
      }
      delete() {
        assert.ok(this.uri.startsWith("file:///sandbox/cache/"));
        deleted++;
        this.exists = false;
      }
    }
    const { stageAudioUpload } = compile(
      require.resolve("../src/services/stageAudioUpload.ts"),
      () => ({
        File: FakeFile,
        Paths: { cache: "file:///sandbox/cache" },
      }),
    );
    await assert.rejects(
      stageAudioUpload(
        { uri: "content://picked/audio", name: "../track.mp3" },
        30 * 1024 * 1024,
      ),
      denied ? /chọn lại file/ : /vượt giới hạn/,
    );
    assert.equal(deleted, 1);
  }
});

test("Expo's real encoder rejects legacy URI parts (reproduces upload failure)", async () => {
  const form = new NativeFormData();
  form.append("file", {
    uri: "file:///avatar.png",
    name: "avatar.png",
    type: "image/png",
  });
  await assert.rejects(convertFormDataAsync(form), /Unsupported FormDataPart/);
});

test("media uploads serialize native images/audio and Web files using SDK-compatible parts", async () => {
  const originalFetch = global.fetch,
    originalFormData = global.FormData;
  try {
    for (const [platform, kind, local, networkFailure] of [
      ["android", "image", false],
      ["ios", "video", false],
      ["android", "video", true],
      ["web", "video", false],
      ["android", "video", false, true],
    ]) {
      const payload = Buffer.from(
        kind === "image" ? "converted PNG bytes" : "audio bytes",
      );
      const uri =
        kind === "image"
          ? "file:///converted.png"
          : platform === "android"
            ? "content://documents/picked.mp3"
            : "file:///picked.mp3";
      const user = { getIdToken: async () => "local-token" };
      let nativeFileReads = 0,
        posted = false,
        cleaned = 0;
      class NativeFile {
        constructor(...parts) {
          this.uri = parts.join("/");
          this.present = parts.length === 1;
          if (parts.length === 1) assert.equal(this.uri, uri);
          else assert.equal(parts[0], "file:///sandbox/cache");
        }
        get exists() {
          return this.present;
        }
        async copy(destination) {
          destination.present = true;
        }
        delete() {
          this.present = false;
          cleaned++;
        }
        get name() {
          return kind === "image" ? "converted.png" : "picked.mp3";
        }
        get type() {
          return kind === "image" ? "image/png" : "audio/mpeg";
        }
        get size() {
          return payload.length;
        }
        async bytes() {
          if (kind === "video")
            assert.ok(
              this.uri.startsWith("file:///sandbox/cache/"),
              "Only the app-scoped copy may be read by the encoder",
            );
          assert.ok(this.present);
          nativeFileReads++;
          return new Uint8Array(payload);
        }
      }
      const runtime = {
        mode: local ? "emulator" : "cloud",
        backendUrl: "https://backend.example.test",
      };
      const { uploadMedia } = compile(
        require.resolve("../src/services/mediaUploadService.ts"),
        (request) => {
          if (request === "react-native") return { Platform: { OS: platform } };
          if (request === "./firebase/config")
            return { getFirebaseRuntime: () => runtime };
          if (request === "./firebase/runtime")
            return { assertExternalUploadsAllowed() {} };
          if (request === "./firebase")
            return { getFirebaseAuth: () => ({ currentUser: user }) };
          if (request === "./prepareImageUpload")
            return {
              prepareImageUpload: async () => ({
                uri,
                name: "converted.png",
                mimeType: "image/png",
                size: payload.length,
              }),
            };
          if (request === "expo-file-system") {
            assert.notEqual(platform, "web");
            return { File: NativeFile };
          }
          if (request === "./stageAudioUpload")
            return compile(
              require.resolve("../src/services/stageAudioUpload.ts"),
              (name) => {
                assert.equal(name, "expo-file-system");
                return {
                  File: NativeFile,
                  Paths: { cache: "file:///sandbox/cache" },
                };
              },
            );
          if (request === "./backendService")
            return {
              backendGet: async () => ({
                cloud: "cloud",
                apiKey: "key",
                publicId: "owned",
                timestamp: 123,
                signature: "signed",
                overwrite: "false",
                allowedFormats: "png,jpg,webp",
              }),
            };
          throw Error(`Unexpected module ${request}`);
        },
      );
      global.FormData = platform === "web" ? originalFormData : NativeFormData;
      global.fetch = async (url, options) => {
        assert.equal(options.method, "POST");
        assert.equal(
          url,
          local
            ? "https://backend.example.test/local-media/upload/audio"
            : `https://api.cloudinary.com/v1_1/cloud/${kind}/upload`,
        );
        assert.equal(options.headers?.["Content-Type"], undefined);
        if (local)
          assert.equal(options.headers.Authorization, "Bearer local-token");
        else assert.equal(options.body.get("signature"), "signed");
        if (platform === "web") {
          assert.deepEqual(
            Buffer.from(await options.body.get("file").arrayBuffer()),
            payload,
          );
        } else {
          const { body } = await convertFormDataAsync(
            options.body,
            "test-boundary",
          );
          assert.ok(Buffer.from(body).includes(payload));
          assert.match(
            new TextDecoder().decode(body),
            new RegExp(kind === "image" ? "image/png" : "audio/mpeg"),
          );
        }
        posted = true;
        if (networkFailure) throw Error("network failed");
        return {
          ok: true,
          json: async () =>
            local
              ? { url: "/local-media/audio.wav", publicId: "local" }
              : {
                  secure_url: "https://cdn.example.test/file",
                  public_id: "owned",
                },
        };
      };
      const upload = uploadMedia(
        {
          uri: kind === "image" ? "file:///original.heic" : uri,
          name: "picked",
          mimeType: "application/octet-stream",
          ...(platform === "web"
            ? { file: new Blob([payload], { type: "audio/mpeg" }) }
            : {}),
        },
        kind,
      );
      if (networkFailure) await assert.rejects(upload, /network failed/);
      else await upload;
      assert.ok(posted);
      assert.equal(nativeFileReads, platform === "web" ? 0 : 1);
      assert.equal(cleaned, platform !== "web" && kind === "video" ? 1 : 0);
    }
  } finally {
    global.fetch = originalFetch;
    global.FormData = originalFormData;
  }
});
