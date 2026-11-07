const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { createAiSearch } = require("./search.cjs");
async function main() {
  if (
    process.env.FIRESTORE_EMULATOR_HOST ||
    !process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT.startsWith("demo-")
  )
    throw Error(
      "Cần GOOGLE_CLOUD_PROJECT thật trong .env.ai và phải tắt FIRESTORE_EMULATOR_HOST. Environment trên Render không tự áp dụng ở máy local.",
    );
  const db = getFirestore(
    initializeApp({
      credential: applicationDefault(),
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
    }),
  );
  const ai = createAiSearch({ db });
  if (!ai.enabled) throw Error("AI is not configured; no indexing performed");
  const snapshot = await db
    .collection("songs")
    .where("active", "==", true)
    .where("isPublic", "==", true)
    .limit(1001)
    .get();
  if (snapshot.size > 1000)
    throw Error(
      "Catalog exceeds MVP limit; use paginated indexer before enabling",
    );
  const songs = [];
  for (const doc of snapshot.docs) {
    const s = doc.data();
    const artist = await db.doc(`users/${s.artistId}`).get();
    if (!artist.exists || artist.data().active !== true) continue;
    songs.push({
      id: doc.id,
      title: s.title,
      artist: s.artistNames?.join(", ") || artist.data().displayName || "",
      genre: s.genre,
    });
  }
  console.log(`Indexed ${await ai.index(songs)} public songs (${ai.version})`);
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
