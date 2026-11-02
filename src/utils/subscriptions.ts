type Stop = () => void;

// Own each listener independently. Removed listeners cannot deliver late data,
// including when an ID is removed and then immediately added again.
export function createKeyedSubscriptions<T>(
  subscribe: (
    id: string,
    next: (value: T) => void,
    fail: (error: Error) => void,
  ) => Stop,
  changed: (
    values: ReadonlyMap<string, T>,
    pendingIds: ReadonlySet<string>,
  ) => void,
  failed: (id: string, error: Error) => void,
  received?: (id: string, value: T) => void,
) {
  const entries = new Map<
    string,
    { stop: Stop; value?: T; failed?: boolean }
  >();
  const emit = () =>
    changed(
      new Map(
        [...entries].flatMap(([id, entry]) =>
          entry.value === undefined ? [] : [[id, entry.value]],
        ),
      ),
      new Set(
        [...entries]
          .filter(([, entry]) => entry.value === undefined && !entry.failed)
          .map(([id]) => id),
      ),
    );
  return {
    update(ids: Iterable<string>) {
      const desired = new Set(ids);
      let removed = false;
      for (const [id, entry] of entries) {
        if (desired.has(id)) continue;
        entries.delete(id);
        entry.stop();
        removed = true;
      }
      if (removed) emit();
      for (const id of desired) {
        if (entries.has(id)) continue;
        const entry: { stop: Stop; value?: T; failed?: boolean } = {
          stop: () => {},
        };
        entries.set(id, entry);
        const current = () => entries.get(id) === entry && !entry.failed;
        try {
          entry.stop = subscribe(
            id,
            (value) => {
              if (!current()) return;
              entry.value = value;
              received?.(id, value);
              emit();
            },
            (error) => {
              if (!current()) return;
              entry.failed = true;
              entry.value = undefined;
              emit();
              failed(id, error);
            },
          );
        } catch (error) {
          entries.delete(id);
          emit();
          failed(id, error instanceof Error ? error : new Error(String(error)));
        }
      }
    },
    retry(id: string) {
      const previous = entries.get(id);
      if (!previous?.failed) return;
      const ids = [...entries.keys()];
      entries.delete(id);
      previous.stop();
      this.update(ids);
    },
    clear() {
      const previous = [...entries.values()];
      entries.clear();
      previous.forEach((entry) => entry.stop());
    },
  };
}

// Session scoped: requests coalesce only while pending. There is no persistent
// permission cache, and results from an old login session cannot be committed.
export function createPendingRequests<T>() {
  const pending = new Map<string, Promise<T>>();
  let generation = 0;
  return {
    invalidate(id: string) {
      pending.delete(id);
    },
    run(
      id: string,
      load: () => Promise<T>,
      commit: (value: T) => void,
    ): Promise<T> {
      const existing = pending.get(id);
      if (existing) return existing;
      const started = generation;
      const request = Promise.resolve()
        .then(load)
        .then((value) => {
          if (started !== generation || pending.get(id) !== request)
            throw new Error("Phiên dữ liệu hoặc quyền truy cập đã thay đổi.");
          commit(value);
          return value;
        })
        .finally(() => {
          if (pending.get(id) === request) pending.delete(id);
        });
      pending.set(id, request);
      return request;
    },
    clear() {
      generation++;
      pending.clear();
    },
  };
}
