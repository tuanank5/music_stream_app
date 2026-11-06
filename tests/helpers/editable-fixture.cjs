const fs = require("node:fs");
const path = require("node:path");
const { buildFixtures } = require("../../tools/local/fixtures.cjs");
const { demoAudio } = require("../../tools/local/demo-audio.cjs");
const { KINDS } = require("../../tools/local/editable-data.cjs");

// Test the importer with original synthesized audio, independent of personal media.
function editableFixture(t) {
  const workspace = path.resolve(__dirname, "../..");
  const localRoot = path.join(workspace, ".local");
  fs.mkdirSync(localRoot, { recursive: true });
  const directory = fs.mkdtempSync(path.join(localRoot, "editable-test-"));
  t.after(() => {
    if (
      path.dirname(directory) !== localRoot ||
      !path.basename(directory).startsWith("editable-test-")
    )
      throw Error("Unexpected fixture cleanup path");
    fs.rmSync(directory, { recursive: true, force: true });
  });
  const rows = Object.fromEntries(KINDS.map((kind) => [kind, []]));
  for (const document of buildFixtures().documents) {
    const parts = document.path.split("/");
    const kind = parts.at(-2);
    const fields = { ...document.data };
    if (kind === "songs") {
      const filename = path.join(directory, path.basename(fields.audioUrl));
      fs.writeFileSync(filename, demoAudio(fields.audioUrl));
      fields.audioUrl = path
        .relative(workspace, filename)
        .replaceAll("\\", "/");
    }
    rows[kind].push({
      id: parts.at(-1),
      ...(parts.length === 4 ? { parentId: parts[1] } : {}),
      ...fields,
    });
  }
  for (const [kind, values] of Object.entries(rows))
    fs.writeFileSync(
      path.join(directory, `${kind}.json`),
      JSON.stringify(values),
    );
  return directory;
}
module.exports = { editableFixture };
