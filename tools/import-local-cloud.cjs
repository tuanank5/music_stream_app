const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { isDeepStrictEqual } = require("node:util");
const { loadEditableData } = require("./local/editable-data.cjs");
const { auditSchema } = require("./backend/schema-audit.cjs");
const PROJECT = "musicstreamapp-5a527";
const ROOT = path.resolve(__dirname, "..");
const hash = (value) => createHash("sha256").update(value).digest("hex");
class ImportError extends Error {}

async function prepare(directory = path.join(ROOT, "data/local")) {
  const { documents, mediaFiles } = await loadEditableData(directory, {
    retainMediaBytes: false,
  });
  if (documents.length > 450)
    throw new ImportError("Demo import supports at most 450 documents.");
  // Only the local-* fixture namespace is allowed; production IDs are never replaced.
  if (
    documents.some((row) =>
      row.path
        .split("/")
        .some((part, i) => i % 2 && !part.startsWith("local-")),
    )
  )
    throw new ImportError("Only local-* document IDs are supported.");
  const media = [
    ...new Map(mediaFiles.map((item) => [item.url, item])).values(),
  ];
  const fingerprint = hash(
    JSON.stringify(documents) +
      JSON.stringify(media.map(({ stored, ownerId }) => ({ stored, ownerId }))),
  );
  return { documents, media, fingerprint };
}

function cloudSettings(env) {
  const cloud = env.CLOUDINARY_CLOUD_NAME,
    key = env.CLOUDINARY_API_KEY,
    secret = env.CLOUDINARY_API_SECRET;
  if (!cloud || !/^[A-Za-z0-9_-]+$/.test(cloud) || !key || !secret)
    throw new ImportError(
      "Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env.import (never in chat).",
    );
  return { cloud, key, secret };
}

async function uploadMedia(item, config, request = fetch) {
  const bytes = fs.readFileSync(item.filename);
  // Reproduce the loader's content/owner hash; refuse a file edited after planning.
  const digest = createHash("sha256")
    .update(String(item.ownerId))
    .update(bytes)
    .digest("hex")
    .slice(0, 32);
  if (item.stored.replaceAll("-", "").split(".")[0] !== digest)
    throw new ImportError(
      "Media changed after planning; run the import again.",
    );
  const resource = item.kind === "audio" ? "video" : "image";
  const publicId = `musicstream/${item.ownerId}/${item.kind === "audio" ? "audio" : "images"}/${path.parse(item.stored).name}`;
  const params = {
    overwrite: "false",
    public_id: publicId,
    timestamp: String(Math.floor(Date.now() / 1000)),
  };
  const signature = createHash("sha1")
    .update(
      Object.entries(params)
        .map(([k, v]) => `${k}=${v}`)
        .join("&") + config.secret,
    )
    .digest("hex");
  const body = new FormData();
  for (const [k, v] of Object.entries({
    ...params,
    api_key: config.key,
    signature,
  }))
    body.set(k, v);
  body.set("file", new Blob([bytes]), item.stored);
  const response = await request(
    `https://api.cloudinary.com/v1_1/${config.cloud}/${resource}/upload`,
    {
      method: "POST",
      body,
      redirect: "error",
      signal: AbortSignal.timeout(180000),
    },
  );
  if (!response.ok)
    throw new ImportError(
      `Cloudinary upload failed (HTTP ${response.status}); progress saved, run again to resume.`,
    );
  const result = await response.json();
  const asset = {
    publicId: result.public_id,
    url: result.secure_url,
    duration: item.duration,
  };
  validateAsset(asset, item, config.cloud);
  return asset;
}

function validateAsset(asset, item, cloud) {
  const resource = item.kind === "audio" ? "video" : "image";
  const expected = `musicstream/${item.ownerId}/${item.kind === "audio" ? "audio" : "images"}/${path.parse(item.stored).name}`;
  let url;
  try {
    url = new URL(asset.url);
  } catch {
    throw new ImportError("Invalid uploaded media URL.");
  }
  const prefix = `/${cloud}/${resource}/upload/`;
  const tail = url.pathname.slice(prefix.length).replace(/^v\d+\//, "");
  if (
    asset.publicId !== expected ||
    url.origin !== "https://res.cloudinary.com" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !url.pathname.startsWith(prefix) ||
    !tail.startsWith(`${expected}.`) ||
    !/^[a-z0-9]+$/i.test(tail.slice(expected.length + 1))
  )
    throw new ImportError(
      "Uploaded media does not match its planned owner/ID/cloud.",
    );
  if (
    item.kind === "audio" &&
    (!Number.isFinite(asset.duration) ||
      asset.duration <= 0 ||
      asset.duration > 10800)
  )
    throw new ImportError("Invalid audio duration.");
}

function materialize(plan, assets, cloud) {
  const replacements = new Map(
    plan.media.map((item) => {
      const asset = assets[item.url];
      if (!asset)
        throw new ImportError("Upload all media before writing Firestore.");
      validateAsset(asset, item, cloud);
      return [item.url, asset];
    }),
  );
  const documents = plan.documents.map(({ path: documentPath, data }) => {
    const next = { ...data };
    for (const field of ["audio", "avatar", "cover"]) {
      const value = next[`${field}Url`];
      const asset = replacements.get(value);
      if (asset) {
        next[`${field}Url`] = asset.url;
        next[`${field}PublicId`] = asset.publicId;
        if (field === "audio") next.durationSeconds = asset.duration;
      } else if (typeof value === "string" && value.startsWith("/"))
        throw new ImportError(
          "Unresolved local media; no Firestore writes performed.",
        );
    }
    return { path: documentPath, data: next };
  });
  const report = auditSchema(documents, {
    mode: "cloud",
    profileSource: "users",
    strictTarget: true,
    maxIssues: 1000,
  });
  if (report.errors)
    throw new ImportError(
      `Cloud schema validation failed (${report.errors} errors).`,
    );
  return documents;
}

async function writeDocuments(db, documents) {
  // One atomic, create-only transaction. A retry cannot overwrite a real user's edits.
  return db.runTransaction(async (tx) => {
    const snapshots = await tx.getAll(
      ...documents.map((row) => db.doc(row.path)),
    );
    for (let i = 0; i < documents.length; i++)
      if (
        snapshots[i].exists &&
        !isDeepStrictEqual(snapshots[i].data(), documents[i].data)
      )
        throw new ImportError(
          `Existing document differs: ${documents[i].path}. No documents overwritten.`,
        );
    let created = 0;
    for (let i = 0; i < documents.length; i++)
      if (!snapshots[i].exists) {
        tx.create(db.doc(documents[i].path), documents[i].data);
        created++;
      }
    return created;
  });
}

function saveState(filename, state) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename + ".tmp", JSON.stringify(state, null, 2));
  fs.renameSync(filename + ".tmp", filename);
}

async function main(args = process.argv.slice(2), env = process.env) {
  const apply = args.includes("--apply");
  if (args.some((arg) => !["--apply", "--ai-disabled"].includes(arg)))
    throw new ImportError(
      "Use [--apply --ai-disabled]. Default: offline plan only.",
    );
  if (apply && !args.includes("--ai-disabled"))
    throw new ImportError(
      "Set AI_ENABLED=false on Render, wait for deploy, then use --apply --ai-disabled.",
    );
  const plan = await prepare();
  console.log(
    JSON.stringify({
      project: PROJECT,
      documents: plan.documents.length,
      media: plan.media.length,
      mediaMiB: Math.round(
        plan.media.reduce((n, m) => n + m.byteLength, 0) / 1024 / 1024,
      ),
      aiCalls: 0,
      mode: apply ? "apply" : "offline-plan",
    }),
  );
  if (!apply) return;
  if (
    env.FIRESTORE_EMULATOR_HOST ||
    env.FIREBASE_AUTH_EMULATOR_HOST ||
    env.GOOGLE_CLOUD_PROJECT !== PROJECT
  )
    throw new ImportError(
      `Use GOOGLE_CLOUD_PROJECT=${PROJECT} and unset emulator variables.`,
    );
  if (
    !env.GOOGLE_APPLICATION_CREDENTIALS ||
    !fs.existsSync(env.GOOGLE_APPLICATION_CREDENTIALS)
  )
    throw new ImportError(
      "Set GOOGLE_APPLICATION_CREDENTIALS to an existing private service-account JSON file.",
    );
  const credential = JSON.parse(
    fs.readFileSync(env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"),
  );
  if (
    credential.type !== "service_account" ||
    credential.project_id !== PROJECT
  )
    throw new ImportError("Service account must belong to the target project.");
  const config = cloudSettings(env);
  const { initializeApp, cert, deleteApp } = require("firebase-admin/app");
  const { getFirestore } = require("firebase-admin/firestore");
  const { getAuth } = require("firebase-admin/auth");
  const filename = path.join(
    ROOT,
    `.local/cloud-import-${PROJECT}-${config.cloud}.json`,
  );
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const lock = fs.openSync(filename + ".lock", "wx");
  let app;
  try {
    let state = fs.existsSync(filename)
      ? JSON.parse(fs.readFileSync(filename, "utf8"))
      : {
          project: PROJECT,
          cloud: config.cloud,
          fingerprint: plan.fingerprint,
          assets: {},
        };
    if (
      state.project !== PROJECT ||
      state.cloud !== config.cloud ||
      state.fingerprint !== plan.fingerprint
    )
      throw new ImportError(
        "Dataset differs from saved import progress; keep the dataset unchanged while resuming.",
      );
    app = initializeApp(
      { projectId: PROJECT, credential: cert(credential) },
      "local-demo-import",
    );
    const db = getFirestore(app),
      auth = getAuth(app);
    // Profiles are display fixtures only. Do not import local passwords or claim real emails.
    for (const row of plan.documents.filter((row) =>
      /^users\/[^/]+$/.test(row.path),
    )) {
      try {
        await auth.getUser(row.path.split("/")[1]);
      } catch (error) {
        if (error.code === "auth/user-not-found") continue;
        throw error;
      }
      throw new ImportError(
        `Auth UID already exists: ${row.path}. Import stopped before uploading.`,
      );
    }
    // Fail early on an ID collision before uploading audio, then recheck atomically at write time.
    const existing = await db.getAll(
      ...plan.documents.map((row) => db.doc(row.path)),
    );
    const allowedExisting = state.committed
      ? materialize(plan, state.assets, config.cloud)
      : [];
    for (let i = 0; i < existing.length; i++)
      if (
        existing[i].exists &&
        !isDeepStrictEqual(existing[i].data(), allowedExisting[i]?.data)
      )
        throw new ImportError(
          `Existing document collision: ${plan.documents[i].path}. No upload/write performed.`,
        );
    for (const [index, item] of plan.media.entries()) {
      if (!state.assets[item.url]) {
        state.assets[item.url] = await uploadMedia(item, config);
        saveState(filename, state);
      } else validateAsset(state.assets[item.url], item, config.cloud);
      console.log(`Media ${index + 1}/${plan.media.length}`);
    }
    const documents = materialize(plan, state.assets, config.cloud);
    // Persist intent first: if the process stops after commit, the next run can compare exactly.
    state.committed = true;
    saveState(filename, state);
    const created = await writeDocuments(db, documents);
    console.log(
      JSON.stringify({
        created,
        unchanged: documents.length - created,
        aiCalls: 0,
        authAccountsCreated: 0,
      }),
    );
  } finally {
    try {
      if (app) await deleteApp(app);
    } finally {
      fs.closeSync(lock);
      fs.unlinkSync(filename + ".lock");
    }
  }
}
if (require.main === module)
  main().catch((error) => {
    // Provider errors can contain request details. The CLI never prints raw error bodies.
    console.error(
      error instanceof ImportError
        ? error.message
        : "Import failed. Check credentials, permissions and saved progress. No AI requests were made.",
    );
    process.exitCode = 1;
  });
module.exports = { prepare, uploadMedia, materialize, writeDocuments, main };
