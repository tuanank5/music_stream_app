const { createHash } = require("node:crypto");
function createRequestId(req, scope) {
  const key = req.headers["idempotency-key"];
  if (key === undefined) return undefined;
  if (typeof key !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(key))
    throw Object.assign(new Error("Idempotency key không hợp lệ."), {
      status: 400,
    });
  return createHash("sha256")
    .update(JSON.stringify([scope, req.auth.uid, key]))
    .digest("hex");
}
module.exports = { createRequestId };
