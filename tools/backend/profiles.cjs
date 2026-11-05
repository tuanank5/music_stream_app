function publicFields(id, value) {
  return {
    userId: id,
    displayName: String(value.displayName || "Music lover").slice(0, 80),
    avatarUrl: String(value.avatarUrl || ""),
    biography: String(value.biography || "").slice(0, 4000),
    active: value.active !== false,
  };
}
async function projectProfile(db, id, dryRun = false) {
  return db.runTransaction(async (tx) => {
    const source = db.doc(`users/${id}`),
      target = db.doc(`publicProfiles/${id}`);
    const [user, profile] = await Promise.all([tx.get(source), tx.get(target)]);
    if (!user.exists) {
      if (profile.exists && !dryRun) tx.delete(target);
      return { id, action: "delete" };
    }
    const fields = publicFields(id, user.data());
    const counters = profile.exists ? profile.data() : user.data();
    for (const key of ["followerCount", "followingCount"]) {
      if (!Number.isSafeInteger(counters[key] ?? 0) || (counters[key] ?? 0) < 0)
        throw new Error(
          `Invalid ${key} for ${id}; reconcile before migration.`,
        );
    }
    const allowed = new Set([
      ...Object.keys(fields),
      "followerCount",
      "followingCount",
      "lastFollowingId",
    ]);
    if (
      profile.exists &&
      Object.entries(fields).every(
        ([key, value]) => profile.data()[key] === value,
      ) &&
      Object.keys(profile.data()).every((key) => allowed.has(key))
    )
      return { id, action: "unchanged" };
    if (!dryRun)
      tx.set(
        target,
        {
          ...fields,
          followerCount: counters.followerCount ?? 0,
          followingCount: counters.followingCount ?? 0,
          ...(typeof counters.lastFollowingId === "string"
            ? { lastFollowingId: counters.lastFollowingId }
            : {}),
        },
        // Replace with a whitelist, preserving only canonical social counters.
      );
    return { id, action: profile.exists ? "update" : "create" };
  });
}
module.exports = { publicFields, projectProfile };
