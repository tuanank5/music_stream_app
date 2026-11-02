const { createServer } = require("node:http");
const { configureLocalAdmin, checkEmulators } = require("./environment.cjs");

async function createLocalBackend() {
  const { auth, db, env } = configureLocalAdmin();
  await checkEmulators(env);
  return createServer(async (request, response) => {
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("Cache-Control", "no-store");
    const send = (status, body) => {
      response.writeHead(status);
      response.end(JSON.stringify(body));
    };
    if (request.method !== "GET")
      return send(405, { error: "Method not allowed" });
    if (request.url === "/health")
      return send(200, {
        mode: "emulator",
        projectId: env.GCLOUD_PROJECT,
        milestone: "M0",
      });
    if (request.url !== "/session")
      return send(404, {
        error: "Not found. Search and retention are later milestones.",
      });
    const bearer = /^Bearer (.+)$/.exec(request.headers.authorization || "");
    if (!bearer) return send(401, { error: "Authentication required" });
    let token;
    try {
      token = await auth.verifyIdToken(bearer[1]);
    } catch {
      return send(401, { error: "Invalid local Auth token" });
    }
    try {
      // A real, authenticated local Auth -> Node -> Firestore round trip.
      const profile = await db.doc(`users/${token.uid}`).get();
      if (!profile.exists) return send(404, { error: "Profile not found" });
      return send(200, {
        uid: token.uid,
        displayName: String(profile.data().displayName || ""),
        isAdmin: token.admin === true,
      });
    } catch {
      return send(503, { error: "Local Firestore unavailable" });
    }
  });
}

if (require.main === module)
  createLocalBackend()
    .then((server) => {
      server.listen(8787, "0.0.0.0", () =>
        console.log(
          "M0 local backend: http://127.0.0.1:8787/health (demo-music-stream only)",
        ),
      );
      for (const signal of ["SIGINT", "SIGTERM"])
        process.on(signal, () => server.close(() => process.exit(0)));
    })
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
module.exports = { createLocalBackend };
