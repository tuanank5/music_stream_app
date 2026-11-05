export type SearchHistoryItem = {
  kind: "song" | "album" | "artist";
  id: string;
  title: string;
  subtitle: string;
};
type Storage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<unknown>;
};
const keyOf = (item: SearchHistoryItem) => `${item.kind}:${item.id}`;

export function parseSearchHistory(raw: string | null): SearchHistoryItem[] {
  if (!raw) return [];
  const values: unknown = JSON.parse(raw);
  if (!Array.isArray(values)) throw new Error("Invalid history");
  const seen = new Set<string>();
  return values
    .flatMap((value) => {
      if (!value || typeof value !== "object") return [];
      const { kind, id, title, subtitle } = value;
      if (
        !["song", "album", "artist"].includes(kind) ||
        typeof id !== "string" ||
        !id ||
        id.includes("/") ||
        typeof title !== "string" ||
        typeof subtitle !== "string"
      )
        return [];
      const item: SearchHistoryItem = {
        kind,
        id,
        title: title.slice(0, 300),
        subtitle: subtitle.slice(0, 300),
      };
      if (seen.has(keyOf(item))) return [];
      seen.add(keyOf(item));
      return [item];
    })
    .slice(0, 20);
}

// One queue per account across mounted Search screens. Every mutation reads the
// preceding persisted result; rejected writes cannot poison subsequent actions.
export function createSearchHistoryService(storage: Storage) {
  const queues = new Map<string, Promise<unknown>>();
  function enqueue<T>(uid: string, work: (key: string) => Promise<T>) {
    const key = `search-history:v1:${encodeURIComponent(uid)}`;
    const result = (queues.get(key) ?? Promise.resolve())
      .catch(() => {})
      .then(() => work(key));
    queues.set(key, result);
    void result
      .finally(() => {
        if (queues.get(key) === result) queues.delete(key);
      })
      .catch(() => {});
    return result;
  }
  function session(uid: string) {
    let snapshot = {
      items: [] as SearchHistoryItem[],
      loading: true,
      error: "",
    };
    const listeners = new Set<() => void>();
    const publish = (next: typeof snapshot) => {
      snapshot = next;
      listeners.forEach((listener) => listener());
    };
    let generation = 0;
    async function run(
      change?: (items: SearchHistoryItem[]) => SearchHistoryItem[],
    ) {
      const request = ++generation;
      try {
        const items = await enqueue(uid, async (key) => {
          let items: SearchHistoryItem[];
          try {
            items = parseSearchHistory(await storage.getItem(key));
          } catch (error) {
            if (
              !(error instanceof SyntaxError) &&
              !(error instanceof Error && error.message === "Invalid history")
            )
              throw error;
            items = [];
            await storage.setItem(key, "[]");
          }
          if (change) {
            items = change(items);
            await storage.setItem(key, JSON.stringify(items));
          }
          return items;
        });
        if (request === generation)
          publish({ items, loading: false, error: "" });
      } catch {
        if (request === generation)
          publish({
            ...snapshot,
            loading: false,
            error: "Không thể đọc/lưu tìm kiếm gần đây. Hãy thử lại.",
          });
      }
    }
    return {
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
      getSnapshot: () => snapshot,
      load: () => run(),
      add: (item: SearchHistoryItem) =>
        run((items) =>
          [
            {
              kind: item.kind,
              id: item.id,
              title: item.title.slice(0, 300),
              subtitle: item.subtitle.slice(0, 300),
            },
            ...items.filter((old) => keyOf(old) !== keyOf(item)),
          ].slice(0, 20),
        ),
      remove: (item: SearchHistoryItem) =>
        run((items) => items.filter((old) => keyOf(old) !== keyOf(item))),
      clear: () => run(() => []),
    };
  }
  return { session };
}
