// Dry-run counters -> users. Retains publicProfiles as rollback sources.
const { migrateProfiles } = require("./profile-migration.cjs");
const {
  parseArguments: parseAuditArguments,
} = require("../audit-target-schema.cjs");
function parseArguments(args) {
  const source = [],
    options = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (["--apply", "--maintenance"].includes(key)) {
      if (options[key]) throw new Error(`Duplicate option: ${key}`);
      options[key] = true;
    } else if (key === "--backup") {
      if (options[key] || !args[i + 1] || args[i + 1].startsWith("--"))
        throw new Error("--backup requires a new file path.");
      options[key] = args[++i];
    } else if (key === "--local") source.push(key);
    else if (key === "--project") source.push(key, args[++i]);
    else throw new Error(`Unsupported option: ${key}`);
  }
  const parsed = parseAuditArguments(source);
  if (
    options["--apply"] &&
    (!parsed["--local"] || !options["--maintenance"] || !options["--backup"])
  )
    throw new Error(
      "Apply is local only and requires --maintenance --backup FILE. Cloud apply is not supported.",
    );
  return { ...parsed, ...options };
}
async function main(args = process.argv.slice(2), migrate = migrateProfiles) {
  const options = parseArguments(args);
  let db, app;
  try {
    if (options["--local"]) {
      const {
        configureLocalAdmin,
        checkEmulators,
      } = require("../local/environment.cjs");
      const config = configureLocalAdmin();
      await checkEmulators(config.env);
      ({ db, app } = config);
    } else {
      const project = options["--project"];
      if (
        !project ||
        project.startsWith("demo-") ||
        process.env.FIRESTORE_EMULATOR_HOST ||
        process.env.FIREBASE_AUTH_EMULATOR_HOST
      )
        throw Error("Specify --local or --project REAL_ID (dry-run default).");
      const {
        initializeApp,
        applicationDefault,
      } = require("firebase-admin/app");
      for (const key of ["GCLOUD_PROJECT", "GOOGLE_CLOUD_PROJECT"])
        if (process.env[key] && process.env[key] !== project)
          throw new Error(`${key} differs from --project.`);
      app = initializeApp(
        { projectId: project, credential: applicationDefault() },
        `profile-migration-${process.pid}`,
      );
      db = require("firebase-admin/firestore").getFirestore(app);
    }
    const report = await migrate(db, {
      apply: !!options["--apply"],
      maintenance: !!options["--maintenance"],
      backupFile: options["--backup"],
    });
    console.log(
      JSON.stringify({ projectId: db.projectId, ...report }, null, 2),
    );
    return report.errors.length ? 2 : 0;
  } finally {
    if (app) await require("firebase-admin/app").deleteApp(app);
  }
}
if (require.main === module)
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
module.exports = { main, parseArguments };
