const fs = require("node:fs");
const path = require("node:path");
const { Timestamp } = require("firebase-admin/firestore");
const { auditSchema } = require("../backend/schema-audit.cjs");
const {
  localEnvironment,
  configureLocalAdmin,
  checkEmulators,
} = require("./environment.cjs");
const ROOT = path.resolve(__dirname, "../../data/local");
const KINDS = [
  "users",
  "songs",
  "albums",
  "playlists",
  "favorites",
  "favoriteAlbums",
  "following",
  "history",
  "playReceipts",
  "posts",
  "comments",
];
const id = (value) =>
  typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);
async function loadEditableData(
  directory = ROOT,
  { retainMediaBytes = true } = {},
) {
  const documents = [];
  const mediaFiles = [];
  const audioCache = new Map();
  for (const kind of KINDS) {
    const rows = JSON.parse(
      fs.readFileSync(path.join(directory, `${kind}.json`), "utf8"),
    );
    if (!Array.isArray(rows))
      throw new Error(`${kind}.json phải là một danh sách.`);
    for (const row of rows) {
      if (!row || !id(row.id))
        throw new Error(`ID không hợp lệ trong ${kind}.json.`);
      const { id: documentId, parentId, ...fields } = row;
      for (const field of ["avatarUrl", "coverUrl", "audioUrl"]) {
        const source = fields[field];
        if (
          typeof source !== "string" ||
          !source ||
          /^https:\/\//.test(source) ||
          source.startsWith("/local-audio/") ||
          source.startsWith("/local-media/")
        )
          continue;
        const workspace = path.resolve(__dirname, "../..");
        const filename = path.resolve(
          workspace,
          source.startsWith("/audio/") ? `assets${source}` : source,
        );
        const relative = path.relative(workspace, filename);
        if (relative.startsWith("..") || path.isAbsolute(relative))
          throw new Error("Ảnh JSON phải nằm trong thư mục dự án.");
        const bytes = fs.readFileSync(filename);
        let ext = bytes
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          ? "png"
          : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
            ? "jpg"
            : bytes.toString("ascii", 0, 4) === "RIFF" &&
                bytes.toString("ascii", 8, 12) === "WEBP"
              ? "webp"
              : null;
        let duration = 0;
        if (field === "audioUrl") {
          let metadata = audioCache.get(filename);
          if (!metadata) {
            const detected = await (
              await import("file-type")
            ).fileTypeFromBuffer(bytes);
            if (
              !detected ||
              !["mp3", "wav", "flac", "ogg", "m4a"].includes(detected.ext)
            )
              throw new Error(`Unsupported audio: ${source}`);
            const parsed = await (
              await import("music-metadata")
            ).parseBuffer(
              bytes,
              { mimeType: detected.mime, size: bytes.length },
              { duration: true },
            );
            const seconds = parsed.format.duration;
            if (
              !Number.isFinite(seconds) ||
              seconds <= 0 ||
              seconds > 10800 ||
              bytes.length > 30 * 1024 * 1024 ||
              parsed.format.trackInfo?.some((track) => track.type === 1)
            )
              throw new Error(
                `Invalid audio duration, size or video track: ${source}`,
              );
            metadata = { ext: detected.ext, duration: seconds };
            audioCache.set(filename, metadata);
          }
          ({ ext, duration } = metadata);
        }
        if (!ext || (field !== "audioUrl" && bytes.length > 5 * 1024 * 1024))
          throw new Error(`Ảnh không hợp lệ hoặc quá 5MB: ${source}`);
        const ownerId = kind === "users" ? documentId : fields.artistId;
        const hash = require("node:crypto")
          .createHash("sha256")
          .update(String(ownerId))
          .update(bytes)
          .digest("hex")
          .slice(0, 32);
        const stored = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20)}.${ext}`;
        fields[field] = `/local-media/${stored}`;
        if (field === "audioUrl") {
          fields.audioPublicId = fields[field];
          fields.durationSeconds = duration;
        }
        mediaFiles.push({
          stored,
          ...(retainMediaBytes
            ? { bytes }
            : { filename, byteLength: bytes.length }),
          ownerId,
          url: fields[field],
          kind: field === "audioUrl" ? "audio" : "image",
          duration,
        });
      }
      const root = ["users", "songs", "albums", "posts"].includes(kind);
      if ((!root && !id(parentId)) || (root && parentId !== undefined))
        throw new Error(`parentId không hợp lệ: ${kind}/${documentId}`);
      for (const field of Object.keys(fields)) {
        if (!field.endsWith("At") && field !== "releaseDate") continue;
        const value = fields[field];
        if (
          typeof value !== "string" ||
          !/^\d{4}-\d{2}-\d{2}T.*Z$/.test(value) ||
          !Number.isFinite(Date.parse(value))
        )
          throw new Error(
            `Ngày phải là ISO UTC: ${kind}/${documentId}.${field}`,
          );
        fields[field] = Timestamp.fromDate(new Date(value));
      }
      documents.push({
        path: root
          ? `${kind}/${documentId}`
          : `${kind === "comments" ? "posts" : "users"}/${parentId}/${kind}/${documentId}`,
        data: fields,
      });
    }
  }
  const report = auditSchema(documents, {
    mode: "emulator",
    profileSource: "users",
    strictTarget: true,
    maxIssues: 1000,
  });
  if (report.errors)
    throw new Error(
      JSON.stringify(
        {
          errors: report.errors,
          issues: report.issues.filter((issue) => issue.severity === "error"),
        },
        null,
        2,
      ),
    );
  return { documents, report, mediaFiles };
}
async function main(args = process.argv.slice(2), directory = ROOT) {
  if (args.length !== 1 || !["check", "apply"].includes(args[0]))
    throw new Error("Use check or apply; chỉ hỗ trợ dataset local cố định.");
  localEnvironment(); // Refuse cloud/mixed project configuration even before reads.
  const { documents, report, mediaFiles } = await loadEditableData(directory);
  if (args[0] === "check") {
    console.log(
      JSON.stringify(
        {
          directory,
          documents: documents.length,
          errors: 0,
          warnings: report.warnings,
          collections: report.collections,
          localImages: mediaFiles.filter((media) => media.kind === "image")
            .length,
          localAudio: mediaFiles.filter((media) => media.kind === "audio")
            .length,
        },
        null,
        2,
      ),
    );
    return;
  }
  const { app, auth, db, env } = configureLocalAdmin();
  try {
    await checkEmulators(env);
    const relationPaths = new Set(
      documents
        .filter((row) => row.path.split("/").at(-2) === "following")
        .map((row) => row.path),
    );
    const existingRelations = await db.collectionGroup("following").get();
    if (existingRelations.docs.some((doc) => !relationPaths.has(doc.ref.path)))
      throw new Error(
        "Emulator có following ngoài dataset. Chưa ghi dữ liệu; gỡ quan hệ thừa trong Emulator hoặc dùng Emulator mới trước khi nạp để counters không lệch.",
      );
    const users = documents.filter((row) => /^users\/[^/]+$/.test(row.path));
    // Keep an exact typed backup of overwritten documents before the first write.
    const backup = [];
    for (let offset = 0; offset < documents.length; offset += 100) {
      const snapshots = await db.getAll(
        ...documents.slice(offset, offset + 100).map((row) => db.doc(row.path)),
      );
      for (const doc of snapshots)
        backup.push({
          path: doc.ref.path,
          data: doc.exists
            ? require("../backend/profile-migration.cjs").encode(doc.data())
            : null,
        });
    }
    const backupFile = path.resolve(
      __dirname,
      `../../.local/editable-data-before-${Date.now()}.json`,
    );
    fs.mkdirSync(path.dirname(backupFile), { recursive: true });
    fs.writeFileSync(
      backupFile,
      JSON.stringify({ projectId: db.projectId, documents: backup }, null, 2),
      { flag: "wx" },
    );
    const mediaRoot = require("../backend/local-media.cjs").ROOT;
    fs.mkdirSync(mediaRoot, { recursive: true });
    for (const media of mediaFiles) {
      const target = path.join(mediaRoot, media.stored);
      if (!fs.existsSync(target))
        fs.writeFileSync(target, media.bytes, { flag: "wx" });
      else if (!fs.readFileSync(target).equals(media.bytes))
        throw new Error("File media local đã thay đổi; không ghi đè.");
      if (!fs.existsSync(target + ".json"))
        fs.writeFileSync(
          target + ".json",
          JSON.stringify({
            ownerId: media.ownerId,
            kind: media.kind,
            bytes: media.bytes.length,
            url: media.url,
            publicId: media.url,
            duration: media.duration,
            createdAt: new Date().toISOString(),
          }),
          { flag: "wx" },
        );
    }
    for (const row of users) {
      const uid = row.path.split("/")[1];
      try {
        await auth.getUser(uid);
        await auth.updateUser(uid, {
          email: row.data.email,
          displayName: row.data.displayName,
          disabled: row.data.active === false,
        });
      } catch (error) {
        if (error.code !== "auth/user-not-found") throw error;
        await auth.createUser({
          uid,
          email: row.data.email,
          displayName: row.data.displayName,
          password: "LocalMusic123!",
          emailVerified: true,
          disabled: row.data.active === false,
        });
      }
    }
    for (let offset = 0; offset < documents.length; offset += 400) {
      const batch = db.batch();
      for (const row of documents.slice(offset, offset + 400))
        batch.set(db.doc(row.path), row.data);
      await batch.commit();
    }
    console.log(
      JSON.stringify(
        {
          projectId: db.projectId,
          written: documents.length,
          backupFile,
          deleted: 0,
        },
        null,
        2,
      ),
    );
  } finally {
    await require("firebase-admin/app").deleteApp(app);
  }
}
if (require.main === module)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
module.exports = { loadEditableData, KINDS, main };
