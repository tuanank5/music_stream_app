const { DatabaseSync } = require("node:sqlite");
const { randomUUID } = require("node:crypto");
const normalize = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
class SearchIndex {
  constructor() {
    this.db = new DatabaseSync(":memory:");
    this.db.exec(
      "CREATE VIRTUAL TABLE terms USING fts5(key UNINDEXED, kind UNINDEXED, title, extra, popularity UNINDEXED)",
    );
    this.epoch = randomUUID();
    this.version = 0;
  }
  put(kind, id, title, extra, popularity = 0) {
    const key = `${kind}:${id}`;
    this.db.prepare("DELETE FROM terms WHERE key = ?").run(key);
    this.db
      .prepare(
        "INSERT INTO terms(key, kind, title, extra, popularity) VALUES (?,?,?,?,?)",
      )
      .run(
        key,
        kind,
        normalize(title),
        normalize(extra),
        Math.max(0, Number(popularity) || 0),
      );
    this.version++;
  }
  remove(kind, id) {
    this.db.prepare("DELETE FROM terms WHERE key = ?").run(`${kind}:${id}`);
    this.version++;
  }
  search(query, kind = "") {
    const q = normalize(query);
    if (!q) return [];
    const tokens = q
      .split(" ")
      .slice(0, 12)
      .map((token) => `"${token}"*`)
      .join(" AND ");
    // FTS narrows candidates. Rank title exact/prefix/all words before metadata;
    // interleave equally relevant kinds so mixed results expose all categories.
    return this.db
      .prepare(
        `WITH matches AS (
      SELECT key, kind, popularity, CASE WHEN title = ? THEN 0 WHEN title LIKE ? THEN 1
      WHEN key IN (SELECT key FROM terms WHERE terms MATCH ?) THEN 2 ELSE 3 END AS relevance FROM terms
      WHERE terms MATCH ? AND (? = '' OR kind = ?)
    ), ranked AS (SELECT *, row_number() OVER(PARTITION BY relevance,kind ORDER BY CAST(popularity AS REAL) DESC,key) AS position FROM matches)
    SELECT key FROM ranked ORDER BY relevance,position,CAST(popularity AS REAL) DESC,key`,
      )
      .all(q, `${q}%`, `title : (${tokens})`, tokens, kind, kind)
      .map((row) => row.key);
  }
  close() {
    this.db.close();
  }
}
module.exports = { SearchIndex, normalize };
