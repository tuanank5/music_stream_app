const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadEditableData } = require("../tools/local/editable-data.cjs");
test("editable JSON dataset loads typed timestamps and exact target documents without persisting editor IDs", async () => {
  const { documents, report, mediaFiles } = await loadEditableData();
  for (const media of mediaFiles.filter((item) => item.kind === "audio")) {
    assert.ok(media.duration > 0);
    assert.ok(documents.some((row) => row.data.audioUrl === media.url && row.data.durationSeconds === media.duration));
  }
  assert.equal(report.errors, 0);
  for (const row of documents) {
    assert.equal(row.data.id, undefined);
    assert.equal(row.data.parentId, undefined);
    if (row.data.createdAt)
      assert.equal(typeof row.data.createdAt.toMillis(), "number");
  }
});
