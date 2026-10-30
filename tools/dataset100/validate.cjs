const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const names = [
  "users",
  "songs",
  "albums",
  "playlists",
  "following",
  "favorites",
  "history",
  "media",
];
const dataset = Object.fromEntries(
  names.map((n) => [
    n,
    JSON.parse(fs.readFileSync(path.join(__dirname, n + ".json"), "utf8")),
  ]),
);
function unique(items, label) {
  const keys = items.map((x) => x.key);
  assert.equal(new Set(keys).size, keys.length, "Trùng key " + label);
  return new Set(keys);
}
function validate() {
  const {
    users,
    songs,
    albums,
    playlists,
    following,
    favorites,
    history,
    media,
  } = dataset;
  assert.equal(users.length, 25);
  assert.equal(users.filter((x) => x.role === "artist").length, 20);
  assert.equal(songs.length, 100);
  assert.equal(albums.length, 20);
  const us = unique(users, "users"),
    ss = unique(songs, "songs"),
    aa = unique(albums, "albums"),
    mm = unique(media, "media");
  unique(playlists, "playlist");
  unique(history, "history");
  for (const a of albums) {
    assert.ok(us.has(a.artistKey));
    assert.ok(mm.has(a.coverMediaKey));
  }
  for (const s of songs) {
    assert.ok(us.has(s.artistKey));
    assert.ok(aa.has(s.albumKey));
    assert.equal(
      albums.find((a) => a.key === s.albumKey).artistKey,
      s.artistKey,
    );
    assert.ok(mm.has(s.coverMediaKey));
    assert.ok(mm.has(s.audioMediaKey));
    assert.ok(s.durationSeconds > 60);
    assert.ok(s.genre.length > 0);
    assert.equal(s.isPublished, s.visibility === "public" && s.active);
    assert.ok(Number.isInteger(s.playCount) && s.playCount >= 0);
  }
  for (const p of playlists) {
    assert.ok(us.has(p.ownerKey));
    assert.ok(p.songKeys.length >= 1 && p.songKeys.length <= 50);
    assert.equal(p.songKeys.length, p.songCount);
    assert.equal(new Set(p.songKeys).size, p.songKeys.length);
    for (const s of p.songKeys) assert.ok(ss.has(s));
  }
  const relations = new Set();
  for (const f of following) {
    assert.ok(
      us.has(f.ownerKey) && us.has(f.targetKey) && f.ownerKey !== f.targetKey,
    );
    const key = f.ownerKey + "/" + f.targetKey;
    assert.ok(!relations.has(key));
    relations.add(key);
  }
  const favs = new Set();
  for (const f of favorites) {
    assert.ok(us.has(f.ownerKey) && ss.has(f.songKey));
    const key = f.ownerKey + "/" + f.songKey;
    assert.ok(!favs.has(key));
    favs.add(key);
  }
  const histories = {};
  for (const h of history) {
    assert.ok(us.has(h.ownerKey) && ss.has(h.songKey));
    assert.ok(h.progressSeconds >= 0 && h.progressSeconds <= h.durationSeconds);
    assert.equal(
      h.durationSeconds,
      songs.find((s) => s.key === h.songKey).durationSeconds,
    );
    histories[h.ownerKey] = (histories[h.ownerKey] || 0) + 1;
    assert.ok(histories[h.ownerKey] <= 100);
  }
  assert.equal(histories["listener-01"], 100);
  assert.ok(!histories["listener-04"]);
  for (const m of media) {
    const f = path.resolve(__dirname, m.file);
    assert.ok(f.startsWith(__dirname + path.sep));
    assert.ok(fs.statSync(f).isFile());
  }
  const counts = Object.fromEntries(names.map((n) => [n, dataset[n].length]));
  counts.publicSongs = songs.filter((s) => s.isPublished).length;
  counts.popSongs = songs.filter(
    (s) => s.isPublished && s.genre.includes("Pop"),
  ).length;
  counts.acousticSongs = songs.filter(
    (s) => s.isPublished && s.genre.includes("Acoustic"),
  ).length;
  assert.ok(counts.popSongs >= 50 && counts.acousticSongs >= 50);
  return counts;
}
if (require.main === module)
  console.log("Dữ liệu schema v2 hợp lệ:", validate());
module.exports = { validate, dataset };
