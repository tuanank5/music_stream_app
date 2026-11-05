const listeners = new Set<(uid: string, path: string) => void>();
export function observeBackendWrites(
  listener: (uid: string, path: string) => void,
) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function notifyBackendWrite(uid: string, path: string) {
  listeners.forEach((listener) => listener(uid, path));
}
