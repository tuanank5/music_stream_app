export type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
};
export function createPager<T>(
  fetchPage: (cursor: string | null, size: number) => Promise<CursorPage<T>>,
  keyOf: (item: T) => string,
  initialSize = 20,
  step = 10,
) {
  let state = {
    items: [] as T[],
    loading: false,
    error: "",
    hasMore: true,
    started: false,
  };
  let cursor: string | null = null,
    closed = false,
    generation = 0,
    pending = false;
  const listeners = new Set<() => void>();
  const publish = () => listeners.forEach((listener) => listener());
  async function load() {
    if (closed || pending || !state.hasMore) return;
    pending = true;
    const request = ++generation;
    state = { ...state, loading: true, error: "" };
    publish();
    try {
      const page = await fetchPage(cursor, state.started ? step : initialSize);
      if (closed || request !== generation) return;
      const items = new Map(state.items.map((item) => [keyOf(item), item]));
      page.items.forEach((item) => items.set(keyOf(item), item));
      cursor = page.nextCursor;
      state = {
        items: [...items.values()],
        loading: false,
        error: "",
        hasMore: page.hasMore,
        started: true,
      };
    } catch (error) {
      if (closed || request !== generation) return;
      if (cursor && (error as { status?: number }).status === 400) {
        cursor = null;
        state = { ...state, items: [], started: false, hasMore: true };
      }
      state = {
        ...state,
        loading: false,
        error:
          error instanceof Error ? error.message : "Không thể tải dữ liệu.",
      };
    } finally {
      if (request === generation) {
        pending = false;
        publish();
      }
    }
  }
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    load,
    start: () => {
      closed = false;
    },
    stop: () => {
      closed = true;
      generation++;
      pending = false;
      state = { ...state, loading: false };
    },
  };
}
