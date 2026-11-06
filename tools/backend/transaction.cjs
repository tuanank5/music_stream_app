const { setTimeout: delay } = require("node:timers/promises");

// The SDK retries normal contention/expiry errors itself. Emulator invalidated
// transaction IDs use a different code-3 message, so start a fresh transaction.
// Callbacks must keep external side effects outside the transaction.
async function runTransaction(db, work) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.runTransaction(work);
    } catch (error) {
      if (
        attempt >= 2 ||
        error.code !== 3 ||
        !/\btransaction is invalid or closed\b/i.test(error.message || "")
      )
        throw error;
      await delay(50 * (attempt + 1));
    }
  }
}
module.exports = { runTransaction };
