// IDs come from paths, never from redundant fields in relation documents.
class FollowGraph {
  constructor(maxRelations = 250000) {
    if (!Number.isSafeInteger(maxRelations) || maxRelations < 1)
      throw new Error("Invalid follow graph limit.");
    this.maxRelations = maxRelations;
    this.size = 0;
    this.version = 0;
    this.incoming = new Map();
    this.outgoing = new Map();
  }
  change(path, removed = false) {
    const match = /^users\/([^/]+)\/following\/([^/]+)$/.exec(path);
    if (!match || match[1] === match[2]) return;
    const [, owner, target] = match;
    const exists = this.outgoing.get(owner)?.has(target) || false;
    if (exists === !removed) return;
    if (!removed && this.size >= this.maxRelations)
      throw new Error(
        "Follow graph capacity exceeded; refusing partial recommendations.",
      );
    const update = (map, id, value) => {
      if (removed) {
        const values = map.get(id);
        values?.delete(value);
        if (!values?.size) map.delete(id);
      } else {
        if (!map.has(id)) map.set(id, new Set());
        map.get(id).add(value);
      }
    };
    update(this.outgoing, owner, target);
    update(this.incoming, target, owner);
    this.size += removed ? -1 : 1;
    this.version++;
  }
  sample(map, id, limit) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 50)
      throw new Error("Follow graph sample must be between 1 and 50.");
    const result = [];
    for (const value of map.get(id) || []) {
      result.push(value);
      if (result.length === limit) break;
    }
    return result;
  }
  followers(id, limit = 50) {
    return this.sample(this.incoming, id, limit);
  }
  following(id, limit = 50) {
    return this.sample(this.outgoing, id, limit);
  }
  clear() {
    this.incoming.clear();
    this.outgoing.clear();
    this.size = 0;
    this.version++;
  }
}
module.exports = { FollowGraph };
