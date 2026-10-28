const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  cleanText,
  httpsUrl,
  normalizeSearch,
  formatDuration,
  validateRegister,
} = require("../src/utils/validation.ts");
test("Tìm tiếng Việt không dấu, đ và khoảng trắng", () => {
  assert.equal(normalizeSearch("  ĐƯỜNG VỀ  "), "duong ve");
  assert.ok(
    normalizeSearch("Một chút bình yên").includes(normalizeSearch("binh yen")),
  );
});
test("Từ chối đường dẫn máy tính và giao thức không phải HTTPS", () => {
  for (const v of [
    "D:\\Music\\song.mp3",
    "http://example.com/a",
    "javascript:alert(1)",
    "file:///x",
  ])
    assert.throws(() => httpsUrl(v, "file"));
  assert.equal(
    httpsUrl("https://example.com/audio.mp3", "file"),
    "https://example.com/audio.mp3",
  );
  assert.equal(httpsUrl("", "file"), "");
});
test("Tên rỗng/giới hạn và trim", () => {
  assert.throws(() => cleanText("  ", "playlist", 80));
  assert.throws(() => cleanText("abc", "title", 2));
  assert.equal(cleanText("  A  ", "title", 3), "A");
});
test("Thời lượng hợp lệ, âm, NaN", () => {
  assert.equal(formatDuration(195), "3:15");
  assert.equal(formatDuration(-3), "0:00");
  assert.equal(formatDuration(NaN), "0:00");
  assert.equal(formatDuration(61.8), "1:01");
});
test("Đăng ký từ chối xác nhận sai, mật khẩu ngắn và email sai", () => {
  assert.throws(() => validateRegister("Đạt", "bad", "password1", "password1"));
  assert.throws(() => validateRegister("Đạt", "a@example.com", "abc", "abc"));
  assert.throws(() =>
    validateRegister("Đạt", "a@example.com", "password1", "password2"),
  );
  assert.equal(
    validateRegister(" Đạt ", " a@example.com ", "password1", "password1")
      .displayName,
    "Đạt",
  );
});
