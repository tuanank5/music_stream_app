export const LOCAL_PROJECT_ID = "demo-music-stream";

export type FirebaseRuntime = {
  mode: "emulator" | "cloud";
  config: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
  emulator?: { host: string; authPort: number; firestorePort: number };
  backendUrl?: string;
};

export function isLocalHost(host: string): boolean {
  if (host === "localhost") return true;
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false;
  const parts = host.split(".").map(Number);
  if (parts.some((part) => part > 255)) return false;
  const [a, b] = parts;
  return (
    a === 127 ||
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function port(value: string | undefined, name: string): number {
  if (
    !value ||
    !/^\d+$/.test(value) ||
    Number(value) < 1 ||
    Number(value) > 65535
  )
    throw new Error(`Thiếu hoặc sai ${name}. Xem README.md (mục Chạy local).`);
  return Number(value);
}

// Pure validation: no SDK instance or request may exist before this succeeds.
export function resolveFirebaseRuntime(
  env: Record<string, string | undefined>,
): FirebaseRuntime {
  const mode = env.EXPO_PUBLIC_FIREBASE_MODE;
  if (mode !== "emulator" && mode !== "cloud")
    throw new Error(
      "Chọn Firebase mode rõ ràng: npm run start:local hoặc EXPO_PUBLIC_FIREBASE_MODE=cloud. Xem README.md (mục Chạy local).",
    );

  if (mode === "emulator") {
    const host = env.EXPO_PUBLIC_EMULATOR_HOST ?? "";
    if (
      !isLocalHost(host) ||
      env.EXPO_PUBLIC_FIREBASE_PROJECT_ID !== LOCAL_PROJECT_ID
    )
      throw new Error(
        "Local chỉ dùng demo-music-stream và host loopback/LAN hợp lệ; không kết nối cloud.",
      );
    const authPort = port(
      env.EXPO_PUBLIC_AUTH_EMULATOR_PORT,
      "AUTH_EMULATOR_PORT",
    );
    const firestorePort = port(
      env.EXPO_PUBLIC_FIRESTORE_EMULATOR_PORT,
      "FIRESTORE_EMULATOR_PORT",
    );
    const backendUrl = env.EXPO_PUBLIC_BACKEND_URL ?? "";
    const url = new URL(backendUrl);
    if (
      url.protocol !== "http:" ||
      url.hostname !== host ||
      !url.port ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      throw new Error(
        "Backend local phải là http://<EMULATOR_HOST>:<port>, không có path hoặc credentials.",
      );
    return {
      mode,
      emulator: { host, authPort, firestorePort },
      backendUrl: url.origin,
      config: {
        apiKey: "demo-local-api-key",
        authDomain: `${LOCAL_PROJECT_ID}.firebaseapp.com`,
        projectId: LOCAL_PROJECT_ID,
        storageBucket: `${LOCAL_PROJECT_ID}.appspot.com`,
        messagingSenderId: "000000000000",
        appId: "1:000000000000:web:local",
      },
    };
  }

  // Reject mixed cloud/emulator configuration rather than interpreting it silently.
  if (
    env.EXPO_PUBLIC_EMULATOR_HOST ||
    env.EXPO_PUBLIC_AUTH_EMULATOR_PORT ||
    env.EXPO_PUBLIC_FIRESTORE_EMULATOR_PORT
  )
    throw new Error("Cloud mode không được chứa cấu hình Emulator.");
  const config = {
    apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "",
  };
  if (
    Object.values(config).some((value) => !value.trim()) ||
    config.projectId.startsWith("demo-")
  )
    throw new Error(
      "Cloud mode cần đầy đủ Firebase Web config của project thật.",
    );
  const backend = env.EXPO_PUBLIC_BACKEND_URL;
  if (backend) {
    const parsed = new URL(backend);
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash
    )
      throw new Error("Backend cloud cần HTTPS origin hợp lệ.");
  }
  return {
    mode,
    config,
    backendUrl: backend ? new URL(backend).origin : undefined,
  };
}

export function assertExternalUploadsAllowed(runtime: FirebaseRuntime): void {
  if (runtime.mode === "emulator")
    throw new Error(
      "Upload Cloudinary đã tắt trong local. Dùng audio demo và artwork fallback của fixture.",
    );
}
