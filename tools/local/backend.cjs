const { configureLocalAdmin, checkEmulators } = require("./environment.cjs");
const { createBackend } = require("../backend/service.cjs");
async function createLocalBackend() {
  const { auth, db, env } = configureLocalAdmin();
  await checkEmulators(env);
  return createBackend({
    auth,
    db,
    projectId: env.GCLOUD_PROJECT,
    mode: "emulator",
  });
}
if (require.main === module)
  createLocalBackend()
    .then((server) => {
      server.listen(
        Number(process.env.LOCAL_BACKEND_PORT || 8787),
        process.env.LOCAL_BACKEND_HOST || "127.0.0.1",
        () => console.log("Local backend listening"),
      );
      for (const signal of ["SIGINT", "SIGTERM"])
        process.on(signal, () => {
          server.closeAllConnections();
          server.close();
        });
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
module.exports = { createLocalBackend };
