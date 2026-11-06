// No --apply: runtime compatibility must be implemented before a target-schema writer.
const fs = require("node:fs");
const path = require("node:path");
const {
  auditSchema,
  readAuditDocuments,
} = require("./backend/schema-audit.cjs");

function parseArguments(args) {
  const result = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (["--local", "--fixtures"].includes(key)) {
      if (result[key]) throw new Error(`Duplicate option: ${key}`);
      result[key] = true;
    } else if (["--project", "--report"].includes(key)) {
      const value = args[++i];
      if (!value || value.startsWith("--") || result[key])
        throw new Error(`Invalid option: ${key}`);
      result[key] = value;
    } else
      throw new Error(
        `Unsupported option: ${key}. Read-only: use --fixtures, --local or --project PROJECT_ID, optionally --report FILE.`,
      );
  }
  if (
    ["--local", "--fixtures", "--project"].filter((key) => result[key])
      .length !== 1
  )
    throw new Error(
      "Choose exactly one of --fixtures, --local or --project PROJECT_ID.",
    );
  if (
    result["--project"] &&
    (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(result["--project"]) ||
      result["--project"].startsWith("demo-"))
  )
    throw new Error(
      "Use --local for a demo project; --project requires a real project ID.",
    );
  return result;
}

async function main(args = process.argv.slice(2)) {
  const options = parseArguments(args);
  let documents, app, db, projectId;
  const local = options["--local"] || options["--fixtures"];
  try {
    if (options["--fixtures"]) {
      const { Timestamp } = require("firebase-admin/firestore");
      const normalize = (value) =>
        value instanceof Date
          ? Timestamp.fromDate(value)
          : Array.isArray(value)
            ? value.map(normalize)
            : value && typeof value === "object"
              ? Object.fromEntries(
                  Object.entries(value).map(([key, v]) => [key, normalize(v)]),
                )
              : value;
      documents = require("./local/fixtures.cjs")
        .buildFixtures()
        .documents.map(({ path, data }) => ({ path, data: normalize(data) }));
      projectId = "offline-local-fixtures";
    } else {
      if (options["--local"]) {
        const {
          configureLocalAdmin,
          checkEmulators,
        } = require("./local/environment.cjs");
        const config = configureLocalAdmin();
        ({ app, db } = config);
        await checkEmulators(config.env);
        projectId = config.env.GOOGLE_CLOUD_PROJECT;
      } else {
        projectId = options["--project"];
        if (
          process.env.FIRESTORE_EMULATOR_HOST ||
          process.env.FIREBASE_AUTH_EMULATOR_HOST
        )
          throw new Error(
            "Unset emulator variables before an explicit cloud audit.",
          );
        for (const key of ["GCLOUD_PROJECT", "GOOGLE_CLOUD_PROJECT"])
          if (process.env[key] && process.env[key] !== projectId)
            throw new Error(
              `${key} differs from --project; refusing ambiguous project.`,
            );
        const {
          initializeApp,
          applicationDefault,
        } = require("firebase-admin/app");
        app = initializeApp(
          { projectId, credential: applicationDefault() },
          `schema-audit-${process.pid}`,
        );
        db = require("firebase-admin/firestore").getFirestore(app);
      }
      documents = await readAuditDocuments(db);
    }
    const marker = db
      ? await db.doc(require("./backend/profiles.cjs").PROFILE_MIGRATION).get()
      : null;
    const report = {
      projectId,
      generatedAt: new Date().toISOString(),
      ...auditSchema(documents, {
        mode: local ? "emulator" : "cloud",
        profileSource:
          marker?.data()?.status === "completed" ? "users" : "legacy",
      }),
    };
    if (options["--report"]) {
      const file = path.resolve(options["--report"]);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(report, null, 2) + "\n", {
        flag: "wx",
      });
    }
    console.log(
      JSON.stringify(
        {
          projectId,
          mode: report.mode,
          scannedDocuments: report.scannedDocuments,
          errors: report.errors,
          warnings: report.warnings,
          issueCounts: report.issueCounts,
          readyToApply: report.readyToApply,
          report: options["--report"]
            ? path.resolve(options["--report"])
            : null,
        },
        null,
        2,
      ),
    );
    // A completed scan with data blockers is distinct from a failed scan (exit 1).
    return report.errors ? 2 : 0;
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
      process.exitCode = 1;
    });
module.exports = { main, parseArguments };
