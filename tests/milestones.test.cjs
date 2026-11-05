require("./helpers/register-local.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createPager } = require("../src/utils/pager.ts");
const { SearchIndex } = require("../tools/backend/search-index.cjs");
const R = require("../src/utils/recommendations.ts");
test("FTS Vietnamese relevance, word prefix, metadata and removal use real SQLite", () => {
  const index = new SearchIndex();
  try {
    index.put("song", "exact", "Đêm Việt", "", 1);
    index.put("song", "prefix", "Đêm Việt Nam", "", 100);
    index.put("song", "words", "Việt trong đêm", "", 1000);
    index.put("album", "metadata", "Khác", "Đêm Việt", 10000);
    assert.deepEqual(index.search("dem viet"), [
      "song:exact",
      "song:prefix",
      "song:words",
      "album:metadata",
    ]);
    assert.deepEqual(index.search("dem viet", "album"), ["album:metadata"]);
    index.remove("song", "exact");
    assert.ok(!index.search("dem viet").includes("song:exact"));
    assert.deepEqual(index.search(' OR " *'), []);
  } finally {
    index.close();
  }
});
test("cursor pager requests 20 then 10, dedupes, serializes, retries same cursor, rejects old sessions", async () => {
  const calls = [];
  let resolve,
    fail = false;
  const pager = createPager(
    async (cursor, size) => {
      calls.push([cursor, size]);
      if (fail) throw Error("offline");
      return new Promise((yes) => {
        resolve = yes;
      });
    },
    (item) => item.id,
  );
  const first = pager.load();
  await pager.load();
  assert.equal(calls.length, 1);
  resolve({ items: [{ id: "a" }], nextCursor: "next", hasMore: true });
  await first;
  fail = true;
  await pager.load();
  assert.equal(pager.getSnapshot().error, "offline");
  fail = false;
  const next = pager.load();
  resolve({
    items: [{ id: "a" }, { id: "b" }],
    nextCursor: "later",
    hasMore: true,
  });
  await next;
  assert.deepEqual(calls, [
    [null, 20],
    ["next", 10],
    ["next", 10],
  ]);
  assert.deepEqual(
    pager.getSnapshot().items.map((item) => item.id),
    ["a", "b"],
  );
  const late = pager.load();
  pager.stop();
  resolve({ items: [{ id: "old" }], hasMore: false, nextCursor: null });
  await late;
  assert.ok(!pager.getSnapshot().items.some((item) => item.id === "old"));
});
function song(id, artistId = "a", extra = {}) {
  return {
    id,
    artistId,
    active: true,
    isPublished: true,
    visibility: "public",
    genre: ["Pop"],
    playCount: Number(id) || 0,
    albumId: "album",
    ...extra,
  };
}
test("charts select Top 50 before seeded shuffle and include every valid genre", () => {
  const songs = Array.from({ length: 80 }, (_, i) => song(String(i)));
  songs.push(
    song("other", "b", { genre: ["Niche"] }),
    song("private", "b", { visibility: "private", playCount: 99999 }),
  );
  const charts = R.genreCharts(songs, "alice");
  const pop = charts.find((chart) => chart.subtitle === "Pop");
  assert.equal(pop.songIds.length, 50);
  assert.equal(new Set(pop.songIds).size, 50);
  assert.deepEqual(
    [...pop.songIds].sort(),
    songs
      .slice(30, 80)
      .map((song) => song.id)
      .sort(),
  );
  assert.deepEqual(R.genreCharts(songs, "alice"), charts);
  assert.notDeepEqual(
    R.genreCharts(songs, "bob")[1].songIds,
    charts[1].songIds,
  );
  assert.ok(charts.some((chart) => chart.subtitle === "Niche"));
});
test("album totals use albumId, full source and valid songs, Home caps and artist 10/6/4 backfill", () => {
  const songs = [
    song("1", "a", { albumId: "one", playCount: 200 }),
    song("2", "a", { albumId: "two", playCount: 9 }),
    song("3", "b", { albumId: "one", visibility: "private", playCount: 999 }),
  ];
  const albums = [
    { id: "one", title: "Same", artistId: "a", isPublished: true },
    { id: "two", title: "Same", artistId: "a", isPublished: true },
  ];
  assert.deepEqual(
    R.trendingAlbums(songs, albums).map((album) => album.totalPlayCount),
    [200, 9],
  );
  const artists = Array.from({ length: 70 }, (_, i) => ({
    id: "a" + i,
    active: true,
    followerCount: 100 - i,
  }));
  const catalog = artists.map((artist, i) => song(String(i), artist.id));
  const home = R.homeArtists(artists, catalog, "self", "seed");
  assert.equal(home.length, 20);
  assert.equal(new Set(home.map((artist) => artist.id)).size, 20);
  assert.deepEqual(
    [
      home.filter((a) => Number(a.id.slice(1)) < 20).length,
      home.filter(
        (a) => Number(a.id.slice(1)) >= 20 && Number(a.id.slice(1)) < 40,
      ).length,
      home.filter((a) => Number(a.id.slice(1)) >= 40).length,
    ],
    [10, 6, 4],
  );
  assert.equal(
    R.homeArtists(artists.slice(0, 7), catalog, "a0", "seed").length,
    6,
  );
  const suggestions = R.suggestSongs(
    catalog,
    [
      {
        songId: "0",
        completed: true,
        listenedSeconds: 80,
        durationSeconds: 80,
      },
    ],
    20,
    ["1"],
    ["a2"],
    "seed",
  );
  assert.equal(suggestions.length, 20);
  assert.equal(new Set(suggestions.map((song) => song.id)).size, 20);
  assert.deepEqual(
    R.suggestSongs(
      catalog,
      [
        {
          songId: "0",
          completed: true,
          listenedSeconds: 80,
          durationSeconds: 80,
        },
      ],
      20,
      ["1"],
      ["a2"],
      "seed",
    ),
    suggestions,
  );
});
