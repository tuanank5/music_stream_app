const PROFILE_MIGRATION = "migrations/profiles-to-users-v1";
const catalogProfile = (value) => ({
  displayName: value.displayName || "",
  avatarUrl: value.avatarUrl || "",
  biography: value.biography || "",
  active: value.active !== false,
  followerCount: value.followerCount,
  followingCount: value.followingCount,
});
async function assertProfilesReady(db) {
  const marker = await db.doc(PROFILE_MIGRATION).get();
  if (marker.exists && marker.data().status === "completed") return;
  if (marker.exists)
    throw new Error(
      "Profile migration is not completed; inspect the migration marker before starting.",
    );
  const legacy = await db.collection("publicProfiles").limit(1).get();
  if (!legacy.empty)
    throw new Error(
      "Legacy publicProfiles found. Stop writers, back up and migrate counters to users before starting this backend.",
    );
}
module.exports = { assertProfilesReady, PROFILE_MIGRATION, catalogProfile };
