const { test } = require("node:test");
const assert = require("node:assert/strict");
const { GENRES, validateGenres } = require("../src/utils/genres.ts");

test("genres accept approved selections and reject arbitrary/empty/oversized input", () => {
  assert.equal(GENRES.includes("Nhạc Trịnh"), false);
  assert.deepEqual(validateGenres(["Pop", "Rock", "Pop"]), ["Pop", "Rock"]);
  assert.throws(() => validateGenres([]));
  assert.throws(() => validateGenres(["arbitrary"]));
  assert.throws(() => validateGenres(GENRES.slice(0, 11)));
});
