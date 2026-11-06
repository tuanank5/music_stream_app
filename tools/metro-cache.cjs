// Metro traverses cached modules concurrently even when maxWorkers is low.
// Bound cache IO separately to avoid Windows EMFILE during warm-cache bundles.
function limitCacheConcurrency(stores, limit = 32) {
  const slots = Array.from({ length: limit }, () => Promise.resolve());
  let next = 0;
  const schedule = (operation) => {
    const slot = next;
    next = (next + 1) % limit;
    const result = slots[slot].then(operation);
    slots[slot] = result.catch(() => {});
    return result;
  };
  for (const store of stores) {
    const get = store.get.bind(store);
    const set = store.set.bind(store);
    store.get = (key) => schedule(() => get(key));
    store.set = (key, value) => schedule(() => set(key, value));
  }
  return stores;
}
module.exports = { limitCacheConcurrency };
