const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadEditableData } = require("../tools/local/editable-data.cjs");
const { editableFixture } = require("./helpers/editable-fixture.cjs");
test("editable JSON dataset loads typed timestamps and exact target documents without persisting editor IDs", async (t) => {
  const { documents, report, mediaFiles } = await loadEditableData(
    editableFixture(t),
  );
  assert.ok(mediaFiles.some((item) => item.kind === "audio"));
  for (const media of mediaFiles.filter((item) => item.kind === "audio")) {
    assert.ok(media.duration > 0);
    assert.ok(
      documents.some(
        (row) =>
          row.data.audioUrl === media.url &&
          row.data.durationSeconds === media.duration,
      ),
    );
  }
  assert.equal(report.errors, 0);
  for (const row of documents) {
    assert.equal(row.data.id, undefined);
    assert.equal(row.data.parentId, undefined);
    if (row.data.createdAt)
      assert.equal(typeof row.data.createdAt.toMillis(), "number");
  }
});
