const admin = require("firebase-admin");
const projectId = process.env.GOOGLE_CLOUD_PROJECT;
if (!projectId) {
  console.error("Cần đặt GOOGLE_CLOUD_PROJECT.");
  process.exit(1);
}
if (!process.argv.includes("--confirm")) {
  console.error(
    "Chạy node seed.cjs --confirm để tạo 2 nghệ sĩ và 3 bài âm thanh demo. Không ghi đè document đã có.",
  );
  process.exit(1);
}
admin.initializeApp({
  projectId,
  credential: admin.credential.applicationDefault(),
});
const db = admin.firestore();
const docs = {
  "artists/demo-artist-1": {
    name: "Music Stream Studio",
    imageUrl: "",
    biography:
      "Nghệ sĩ minh họa của dự án. Các âm thanh là giai điệu tổng hợp.",
    active: true,
  },
  "artists/demo-artist-2": {
    name: "Demo Acoustic",
    imageUrl: "",
    biography: "Dữ liệu mẫu cho báo cáo.",
    active: true,
  },
};
for (let i = 1; i <= 3; i++)
  docs[`songs/demo-song-${i}`] = {
    title: ["Bình minh", "Một chút bình yên", "Thành phố về đêm"][i - 1],
    artist: i === 3 ? "Demo Acoustic" : "Music Stream Studio",
    artistId: i === 3 ? "demo-artist-2" : "demo-artist-1",
    album: "Bộ sưu tập demo",
    coverUrl: "",
    audioUrl: "",
    audioKey: `demo${i}`,
    durationSeconds: 12,
    lyrics: "Âm thanh không lời, được tổng hợp cho bản demo.",
    active: true,
  };
(async () => {
  for (const [path, value] of Object.entries(docs)) {
    const ref = db.doc(path);
    await db.runTransaction(async (t) => {
      const s = await t.get(ref);
      if (!s.exists) t.create(ref, value);
    });
    console.log("Đã kiểm tra:", path);
  }
  console.log("Hoàn tất. Document có sẵn không bị ghi đè.");
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
