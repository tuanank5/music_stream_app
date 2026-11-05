const { test } = require("node:test");
const assert = require("node:assert/strict");
const { chooseRelated } = require("../tools/backend/related-artists.cjs");
test("related artists handles sparse followers, genre/following fallbacks and popular discovery", () => {
  const catalog = {
    artists: ["self", "a", "b", "c", "inactive", "no-song"].map((id) => ({
      id,
      active: id !== "inactive",
      followerCount: id === "c" ? 20 : 1,
    })),
    songs: ["self", "a", "b", "c", "inactive"].map((artistId) => ({
      artistId,
      genre: [artistId === "self" || artistId === "a" ? "Pop" : "Rock"],
    })),
  };
  const genre = chooseRelated(catalog, "self");
  assert.equal(genre.title, "Có thể bạn thích");
  assert.equal(genre.ids[0], "a");
  assert.ok(!genre.ids.includes("self"));
  assert.ok(!genre.ids.includes("inactive"));
  assert.ok(!genre.ids.includes("no-song"));
  const fan = chooseRelated(
    catalog,
    "self",
    new Map([
      ["a", 1],
      ["b", 3],
      ["c", 2],
    ]),
  );
  assert.equal(fan.title, "Người hâm mộ cũng thích");
  assert.deepEqual(fan.ids, ["b", "c", "a"]);
  const noSignals = chooseRelated(catalog, "no-song");
  assert.equal(noSignals.title, "Khám phá nghệ sĩ");
  assert.equal(noSignals.ids[0], "c");
  const following = chooseRelated(
    catalog,
    "no-song",
    new Map(),
    new Set(["b"]),
  );
  assert.equal(following.title, "Có thể bạn thích");
  assert.equal(following.ids[0], "b");
});
