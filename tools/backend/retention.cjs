const { FieldPath, Timestamp } = require("firebase-admin/firestore");
// Query and deletes share a transaction. A concurrent progress update conflicts
// and retries against a fresh boundary. Receipts remain as anti-double-count guards.
async function retainHistory(
  db,
  uid,
  { keep = 1000, batchSize = 100, now = Date.now() } = {},
) {
  const count = await db.collection(`users/${uid}/history`).count().get();
  if (count.data().count <= keep) return 0;
  return db.runTransaction(async (tx) => {
    const ref = db.collection(`users/${uid}/history`);
    const ordered = ref
      .orderBy("playedAt", "desc")
      .orderBy(FieldPath.documentId(), "desc");
    const protectedRows = await tx.get(ordered.limit(keep));
    if (protectedRows.size < keep) return 0;
    const old = await tx.get(
      ordered.startAfter(protectedRows.docs.at(-1)).limit(batchSize),
    );
    const cutoff = Timestamp.fromMillis(now - 120000);
    const removable = old.docs.filter(
      (row) => row.get("playedAt")?.toMillis() < cutoff.toMillis(),
    );
    for (const row of removable) tx.delete(row.ref);
    return removable.length;
  });
}
function startRetention(db, onError = console.error, interval = 900000) {
  let running = false,
    closed = false;
  const tick = async () => {
    if (running || closed) return;
    running = true;
    try {
      let cursor;
      do {
        let query = db
          .collection("users")
          .orderBy(FieldPath.documentId())
          .limit(50);
        if (cursor) query = query.startAfter(cursor);
        const page = await query.get();
        for (const user of page.docs) {
          if (closed) break;
          for (let batch = 0; batch < 10; batch++) {
            if (closed || (await retainHistory(db, user.id)) < 100) break;
          }
        }
        cursor = page.size === 50 ? page.docs.at(-1) : null;
      } while (cursor && !closed);
    } catch (error) {
      onError(error);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => {
    void tick();
  }, interval);
  timer.unref();
  return {
    tick,
    stop: () => {
      closed = true;
      clearInterval(timer);
    },
  };
}
module.exports = { retainHistory, startRetention };
