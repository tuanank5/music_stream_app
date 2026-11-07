import { getFirebaseAuth } from "./firebase";
import { getFirebaseRuntime } from "./firebase/config";
import { notifyBackendWrite } from "./backendEvents";
const pending = new Map<string, Promise<unknown>>();
function transportError(error: unknown, signal: AbortSignal): unknown {
  if (signal.aborted)
    return Object.assign(
      new Error("Máy chủ phản hồi chậm. Vui lòng thử tải lại sau."),
      { code: "BACKEND_TIMEOUT" },
    );
  if (
    error instanceof Error &&
    !(error as Error & { status?: number }).status &&
    (error.name === "AbortError" ||
      /fetch failed|failed to fetch|network request failed|fetch request has been cancel(?:l)?ed/i.test(
        error.message,
      ))
  )
    return Object.assign(
      new Error("Không kết nối được máy chủ. Kiểm tra mạng và thử lại."),
      { code: "BACKEND_NETWORK_ERROR" },
    );
  return error;
}
export async function backendPatch<T>(path: string, data: unknown): Promise<T> {
  return backendWrite<T>("PATCH", path, data);
}
export async function backendPost<T>(
  path: string,
  data: unknown,
  idempotencyKey?: string,
): Promise<T> {
  return backendWrite<T>("POST", path, data, idempotencyKey);
}
export async function backendDelete<T>(path: string): Promise<T> {
  return backendWrite<T>("DELETE", path, undefined);
}
export async function backendPut<T>(path: string): Promise<T> {
  return backendWrite<T>("PUT", path, undefined);
}
async function backendWrite<T>(
  method: "POST" | "PATCH" | "DELETE" | "PUT",
  path: string,
  data: unknown,
  idempotencyKey?: string,
): Promise<T> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Cần đăng nhập.");
  const runtime = getFirebaseRuntime();
  if (!runtime.backendUrl)
    throw new Error("Chưa cấu hình EXPO_PUBLIC_BACKEND_URL.");
  const token = await user.getIdToken();
  if (getFirebaseAuth().currentUser !== user)
    throw new Error("Phiên đăng nhập đã thay đổi.");
  const controller = new AbortController();
  // Saving a cloud song may inspect up to 30 MB of audio on the server.
  const timeout =
    runtime.mode === "cloud" && method === "POST" && path === "/audio-lyric"
      ? 360000
      : runtime.mode === "cloud" && method === "POST" && path === "/songs"
        ? 60000
        : 15000;
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(`${runtime.backendUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    const body = await response.json();
    if (!response.ok)
      throw Object.assign(
        new Error(body.error || `Backend: ${response.status}`),
        { status: response.status },
      );
    if (getFirebaseAuth().currentUser !== user)
      throw new Error("Phiên đăng nhập đã thay đổi.");
    notifyBackendWrite(user.uid, path);
    return body as T;
  } catch (error) {
    throw transportError(error, controller.signal);
  } finally {
    clearTimeout(timer);
  }
}
export async function backendGet<T>(
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Cần đăng nhập.");
  const runtime = getFirebaseRuntime();
  if (!runtime.backendUrl)
    throw new Error("Chưa cấu hình EXPO_PUBLIC_BACKEND_URL.");
  const query = new URLSearchParams(params).toString();
  const key = `${runtime.config.projectId}:${user.uid}:${path}:${query}`;
  const existing = pending.get(key);
  if (existing) return existing as Promise<T>;
  const request = (async () => {
    const token = await user.getIdToken();
    if (getFirebaseAuth().currentUser !== user)
      throw new Error("Phiên đăng nhập đã thay đổi.");
    const controller = new AbortController();
    // Render Free can take about a minute to wake. Keep one deduplicated read
    // alive through startup instead of aborting every subscriber after 15s.
    const timer = setTimeout(
      () => controller.abort(),
      runtime.mode === "cloud" ? 90000 : 15000,
    );
    try {
      const response = await fetch(`${runtime.backendUrl}${path}?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      const body = await response.json();
      if (!response.ok)
        throw Object.assign(
          new Error(body.error || `Backend: ${response.status}`),
          { status: response.status },
        );
      if (getFirebaseAuth().currentUser !== user)
        throw new Error("Phiên đăng nhập đã thay đổi.");
      return body as T;
    } catch (error) {
      throw transportError(error, controller.signal);
    } finally {
      clearTimeout(timer);
    }
  })();
  pending.set(key, request);
  try {
    return await request;
  } finally {
    if (pending.get(key) === request) pending.delete(key);
  }
}
