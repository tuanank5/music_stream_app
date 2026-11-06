// Read-only preflight for the target schema. This module has no write API.
const { FieldPath, Timestamp } = require("firebase-admin/firestore");
const { GENRES } = require("../../src/utils/genres.ts");
const FIELDS = {
  users:
    "displayName email avatarUrl avatarPublicId biography followerCount followingCount active createdAt updatedAt",
  songs:
    "title artistId artistNames albumId coverUrl coverPublicId audioUrl audioPublicId durationSeconds genre lyric description isPublic active playCount releaseDate createdAt updatedAt",
  albums:
    "title artistId description coverUrl coverPublicId isPublic releaseDate createdAt updatedAt",
  playlists: "name description isPublic songIds createdAt updatedAt",
  favorites: "favoritedAt",
  favoriteAlbums: "favoritedAt",
  following: "followedAt",
  history:
    "songId playedAt startedAt progressSeconds durationSeconds listenedSeconds completed counted",
  playReceipts: "historyId countedAt",
  posts: "ownerId content songId active createdAt updatedAt",
  comments: "ownerId content createdAt updatedAt",
};
const LEGACY = {
  users:
    "userId photoURL lastFollowingId lastCountedSongId lastCountedHistoryId",
  songs:
    "songId albumTitle album artistName artist tags audioKey visibility isPublished lastCountedBy lastCountedHistoryId lastPlayUid lastPlayHistoryId lyrics cover",
  albums: "albumId artistName isPublished songIds",
  playlists: "userId playlistId visibility songCount",
  favorites: "songId",
  favoriteAlbums: "albumId",
  following: "userId artistId",
  history: "historyId",
  playReceipts: "songId",
  posts: "postId authorName",
  comments: "commentId authorName",
};
const ROOTS = ["users", "publicProfiles", "songs", "albums", "posts"];
const GROUPS = [
  "playlists",
  "favorites",
  "favoriteAlbums",
  "following",
  "history",
  "playReceipts",
  "comments",
];

// A collection-group scan also sees children whose parent no longer exists.
async function readAuditDocuments(
  db,
  { pageSize = 200, maxDocuments = 250000, tx } = {},
) {
  if (
    !Number.isSafeInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 1000 ||
    !Number.isSafeInteger(maxDocuments) ||
    maxDocuments < 1
  )
    throw new Error("Invalid audit scan limits.");
  const documents = [];
  for (const [group, names] of [
    [false, ROOTS],
    [true, GROUPS],
  ]) {
    for (const name of names) {
      let cursor;
      do {
        let query = (group ? db.collectionGroup(name) : db.collection(name))
          .orderBy(FieldPath.documentId())
          .limit(pageSize);
        if (cursor) query = query.startAfter(cursor);
        const page = await (tx ? tx.get(query) : query.get());
        for (const doc of page.docs) {
          if (documents.length >= maxDocuments)
            throw new Error(
              "Audit exceeds maxDocuments; no complete report was produced.",
            );
          documents.push({
            path: doc.ref.path,
            data: doc.data(),
            updateTime: doc.updateTime,
          });
        }
        cursor = page.size === pageSize ? page.docs.at(-1) : null;
      } while (cursor);
    }
  }
  return documents;
}

function auditSchema(
  documents,
  {
    mode = "cloud",
    maxIssues = 500,
    profileSource = "legacy",
    strictTarget = false,
  } = {},
) {
  if (
    !["cloud", "emulator"].includes(mode) ||
    !["legacy", "users"].includes(profileSource) ||
    !Number.isSafeInteger(maxIssues) ||
    maxIssues < 1
  )
    throw new Error("Invalid audit options.");
  const all = new Map();
  for (const { path, data } of documents) {
    if (all.has(path)) throw new Error(`Duplicate input document: ${path}`);
    if (!data || typeof data !== "object" || Array.isArray(data))
      throw new Error(`Invalid input document: ${path}`);
    all.set(path, data);
  }
  const issues = [],
    issueCounts = {},
    collections = {},
    removals = {};
  let errors = 0,
    warnings = 0;
  function issue(severity, path, code, field, details) {
    if (severity === "error") errors++;
    else warnings++;
    issueCounts[code] = (issueCounts[code] || 0) + 1;
    if (issues.length < maxIssues)
      issues.push({
        severity,
        path,
        code,
        ...(field ? { field } : {}),
        ...(details ? { details } : {}),
      });
  }
  const error = (p, code, field, details) =>
    issue("error", p, code, field, details);
  const warn = (p, code, field, details) =>
    issue("warning", p, code, field, details);
  const timestamp = (v) => v instanceof Timestamp;
  const count = (v) => Number.isSafeInteger(v) && v >= 0;
  const number = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0;
  const id = (v) => typeof v === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(v);
  const https = (v) => {
    try {
      const url = new URL(v);
      return url.protocol === "https:" && !url.username && !url.password;
    } catch {
      return false;
    }
  };
  const counters = new Map();
  for (const path of all.keys())
    if (/^users\/[^/]+$/.test(path))
      counters.set(path.split("/")[1], { followerCount: 0, followingCount: 0 });

  // Reconcile against *all* relations, including inactive accounts, without resetting counters.
  for (const [path, value] of all) {
    const match = /^users\/([^/]+)\/following\/([^/]+)$/.exec(path);
    if (!match) continue;
    const [, owner, target] = match;
    if (!counters.has(owner) || !counters.has(target) || owner === target) {
      error(path, "invalid_follow_relation");
      continue;
    }
    if (value.userId !== undefined && value.userId !== target)
      error(path, "relation_id_conflict", "userId");
    counters.get(owner).followingCount++;
    counters.get(target).followerCount++;
  }
  const profileReconciliation = [];
  for (const [uid, actual] of counters) {
    const user = all.get(`users/${uid}`),
      profile =
        profileSource === "legacy"
          ? all.get(`publicProfiles/${uid}`)
          : undefined;
    const canonical = profile || user;
    const differences = [];
    for (const field of ["followerCount", "followingCount"]) {
      const source = profile ? `publicProfiles/${uid}` : `users/${uid}`;
      if (!count(canonical[field])) error(source, "invalid_counter", field);
      else if (canonical[field] !== actual[field])
        error(source, "counter_relation_mismatch", field, {
          stored: canonical[field],
          relations: actual[field],
        });
      if (profile && user[field] !== profile[field]) differences.push(field);
    }
    if (differences.length)
      warn(`users/${uid}`, "stale_user_counters", differences.join(","));
    profileReconciliation.push({
      uid,
      source: profile ? "publicProfiles" : "users",
      ...actual,
      staleUserFields: differences,
    });
    if (profile) {
      for (const field of ["displayName", "avatarUrl", "biography", "active"])
        if (profile[field] !== user[field])
          warn(`publicProfiles/${uid}`, "profile_metadata_drift", field);
    }
  }
  let legacyPrivacyDocuments = 0,
    missingAudio = 0;
  for (const [path, value] of all) {
    const parts = path.split("/"),
      kind = parts.at(-2),
      key = parts.at(-1);
    collections[kind] = (collections[kind] || 0) + 1;
    if (kind === "publicProfiles" && parts.length === 2) {
      if (!all.has(`users/${key}`)) error(path, "orphan_public_profile");
      continue;
    }
    const validPath =
      (ROOTS.includes(kind) &&
        kind !== "publicProfiles" &&
        parts.length === 2) ||
      (GROUPS.includes(kind) &&
        parts.length === 4 &&
        (kind === "comments" ? parts[0] === "posts" : parts[0] === "users"));
    if (!validPath || !FIELDS[kind]) {
      error(path, "unexpected_path");
      continue;
    }
    if (!id(key)) error(path, "invalid_document_id");
    if (parts.length === 4 && !all.has(`${parts[0]}/${parts[1]}`))
      error(path, "orphan_parent");
    const allowed = new Set(FIELDS[kind].split(" "));
    const legacy = new Set((LEGACY[kind] || "").split(" "));
    if (strictTarget) {
      for (const field of allowed)
        if (!Object.hasOwn(value, field))
          error(path, "required_field_missing", field);
      for (const field of legacy)
        if (Object.hasOwn(value, field))
          error(path, "legacy_field_remaining", field);
      const strings = {
        users: {
          displayName: 80,
          email: 320,
          avatarUrl: 2048,
          biography: 4000,
        },
        songs: {
          title: 150,
          artistId: 128,
          coverUrl: 2048,
          audioUrl: 2048,
          lyric: 12000,
          description: 4000,
        },
        albums: {
          title: 150,
          artistId: 128,
          coverUrl: 2048,
          description: 4000,
        },
        playlists: { name: 80, description: 500 },
        posts: { ownerId: 128, content: 2000 },
        comments: { ownerId: 128, content: 1000 },
      };
      for (const [field, limit] of Object.entries(strings[kind] || {}))
        if (typeof value[field] !== "string" || value[field].length > limit)
          error(path, "invalid_text", field);
      if (kind === "songs" && value.albumId !== null && !id(value.albumId))
        error(path, "invalid_album_link", "albumId");
      if (kind === "posts" && value.songId !== null && !id(value.songId))
        error(path, "invalid_song_reference", "songId");
    }
    for (const field of Object.keys(value)) {
      if (allowed.has(field)) continue;
      if (legacy.has(field)) {
        const name = `${kind}.${field}`;
        removals[name] = (removals[name] || 0) + 1;
      } else error(path, "unreviewed_field", field);
    }
    for (const field of allowed) {
      const v = value[field];
      if (field.endsWith("At") || field === "releaseDate") {
        if (!timestamp(v)) error(path, "missing_or_invalid_timestamp", field);
      }
      if (
        ["active", "completed", "counted"].includes(field) &&
        typeof v !== "boolean"
      )
        error(path, "invalid_boolean", field);
    }
    for (const field of [
      "userId",
      "songId",
      "albumId",
      "playlistId",
      "historyId",
      "postId",
      "commentId",
    ]) {
      if (
        legacy.has(field) &&
        value[field] !== undefined &&
        value[field] !== key &&
        !(
          field === "userId" &&
          kind === "playlists" &&
          value[field] === parts[1]
        )
      )
        error(path, "duplicate_id_conflict", field);
    }
    for (const field of ["avatar", "cover", "audio"]) {
      const url = `${field}Url`,
        publicId = `${field}PublicId`;
      if (!allowed.has(url)) continue;
      const localAudio =
        mode === "emulator" &&
        ((field === "audio" &&
          [
            "/local-audio/sample-long.wav",
            "/local-audio/sample-short.wav",
          ].includes(value[url])) ||
          /^\/local-media\/[a-f0-9-]{36}\.(?:mp3|wav|flac|ogg|m4a|jpg|png|webp)$/.test(
            value[url] || "",
          ));
      if (value[url] !== undefined && typeof value[url] !== "string")
        error(path, "invalid_media_url", url);
      else if (value[url] && !https(value[url]) && !localAudio)
        error(path, "invalid_media_url", url);
      if (value[publicId] === undefined)
        warn(path, "nullable_field_missing", publicId);
      else if (
        value[publicId] !== null &&
        (typeof value[publicId] !== "string" || !value[publicId].trim())
      )
        error(path, "invalid_public_id", publicId);
      if (value[url] && !value[publicId] && !localAudio)
        warn(path, "media_ownership_unverified", publicId);
    }
    if (["songs", "albums", "playlists"].includes(kind)) {
      if (value.isPublic !== undefined && typeof value.isPublic !== "boolean")
        error(path, "invalid_boolean", "isPublic");
      const visibility = value.visibility;
      if (
        visibility !== undefined &&
        !["public", "private", "unlisted", "followers"].includes(visibility)
      )
        error(path, "unknown_visibility", "visibility");
      // Only explicit public+published maps to public. Missing/ambiguous fields require review.
      let legacyPublic;
      if (kind === "albums")
        legacyPublic =
          typeof value.isPublished === "boolean"
            ? value.isPublished
            : undefined;
      else if (
        visibility === "private" ||
        visibility === "unlisted" ||
        visibility === "followers"
      )
        legacyPublic = false;
      else if (visibility === "public")
        legacyPublic =
          kind === "playlists"
            ? true
            : typeof value.isPublished === "boolean"
              ? value.isPublished
              : undefined;
      if (typeof value.isPublic !== "boolean" && legacyPublic === undefined)
        error(path, "ambiguous_privacy", "isPublic");
      if (
        typeof value.isPublic === "boolean" &&
        legacyPublic !== undefined &&
        value.isPublic !== legacyPublic
      )
        error(path, "conflicting_privacy", "isPublic");
      if (["unlisted", "followers"].includes(visibility)) {
        legacyPrivacyDocuments++;
        warn(path, "legacy_access_will_be_restricted", "visibility", {
          targetIsPublic: false,
        });
      }
    }
    if (["songs", "albums", "posts", "comments"].includes(kind)) {
      const field = ["songs", "albums"].includes(kind) ? "artistId" : "ownerId";
      if (!id(value[field]) || !all.has(`users/${value[field]}`))
        error(path, "missing_owner", field);
    }
    if (kind === "songs") {
      if (!value.audioUrl) {
        missingAudio++;
        error(path, "missing_audio_url", "audioUrl");
      }
      if (
        !number(value.durationSeconds) ||
        value.durationSeconds <= 0 ||
        value.durationSeconds > 86400
      )
        error(path, "invalid_duration", "durationSeconds");
      if (!count(value.playCount)) error(path, "invalid_counter", "playCount");
      if (
        !Array.isArray(value.genre) ||
        value.genre.length < 1 ||
        value.genre.length > 10 ||
        new Set(value.genre).size !== value.genre.length ||
        value.genre.some((g) => !GENRES.includes(g))
      )
        error(path, "invalid_genres", "genre");
      if (
        !Array.isArray(value.artistNames) ||
        !value.artistNames.length ||
        value.artistNames.length > 10 ||
        value.artistNames.some(
          (name) =>
            typeof name !== "string" || !name.trim() || name.length > 80,
        )
      )
        error(path, "invalid_artist_names", "artistNames");
      if (value.albumId) {
        const album = all.get(`albums/${value.albumId}`);
        if (!album || album.artistId !== value.artistId)
          error(path, "invalid_album_link", "albumId");
      } else if (value.albumId !== null)
        warn(path, "normalize_nullable_album", "albumId");
    }
    if (kind === "playlists") {
      const ids = value.songIds;
      if (
        !Array.isArray(ids) ||
        ids.length > 50 ||
        new Set(ids).size !== ids.length ||
        ids.some((s) => !id(s))
      )
        error(path, "invalid_playlist_membership", "songIds");
      else
        for (const songId of ids)
          if (!all.has(`songs/${songId}`))
            warn(path, "missing_song_reference", "songIds");
    }
    if (kind === "history") {
      for (const field of [
        "progressSeconds",
        "durationSeconds",
        "listenedSeconds",
      ])
        if (!number(value[field])) error(path, "invalid_history_number", field);
      if (!id(value.songId)) error(path, "invalid_song_reference", "songId");
      else if (!all.has(`songs/${value.songId}`))
        warn(path, "missing_song_reference", "songId");
      if (
        number(value.progressSeconds) &&
        number(value.durationSeconds) &&
        value.progressSeconds > value.durationSeconds
      )
        error(path, "history_progress_exceeds_duration", "progressSeconds");
      if (
        timestamp(value.startedAt) &&
        timestamp(value.playedAt) &&
        value.startedAt.toMillis() > value.playedAt.toMillis()
      )
        error(path, "history_time_order", "startedAt");
    }
    if (kind === "playReceipts") {
      if (!id(value.historyId))
        error(path, "invalid_history_reference", "historyId");
      else if (!all.has(`users/${parts[1]}/history/${value.historyId}`))
        // Retention intentionally leaves receipts behind.
        warn(path, "receipt_history_pruned", "historyId");
    }
    if (
      ["posts", "comments"].includes(kind) &&
      (typeof value.content !== "string" || !value.content.trim())
    )
      error(path, "invalid_content", "content");
    if (["users", "songs", "albums", "playlists"].includes(kind)) {
      const field =
        kind === "users"
          ? "displayName"
          : kind === "playlists"
            ? "name"
            : "title";
      if (typeof value[field] !== "string" || !value[field].trim())
        error(path, "invalid_name", field);
    }
  }
  return {
    version: "target-schema-preflight-v1",
    mode: "dry-run",
    sourceMode: mode,
    profileSource,
    scannedDocuments: all.size,
    collections,
    dataValid: errors === 0,
    errors,
    warnings,
    issueCounts,
    issues,
    issuesTruncated: errors + warnings > issues.length,
    legacyFieldsToRemove: removals,
    profileReconciliation,
    songsMissingAudioUrl: missingAudio,
    legacyPrivacyDocuments,
    readyToApply: false,
    rolloutBlockers: [
      "Runtime uses the target isPublic schema; migrate and validate legacy data before rollout.",
      "Cloud apply/restore and real managed-media import remain unverified; local apply is limited to 400 source documents.",
      "Stop all writers and repeat this multi-query audit against a backed-up maintenance snapshot before apply.",
      "Asset ownership and audio duration must be verified with the media provider before real-data import.",
    ],
  };
}

module.exports = { auditSchema, readAuditDocuments, FIELDS, LEGACY };
