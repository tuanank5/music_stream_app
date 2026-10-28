const admin = require("firebase-admin");
const uid = process.argv[2],
  projectId = process.env.GOOGLE_CLOUD_PROJECT;
if (!uid || !projectId) {
  console.error("Cần GOOGLE_CLOUD_PROJECT và node set-admin.cjs UID [revoke]");
  process.exit(1);
}
admin.initializeApp({
  projectId,
  credential: admin.credential.applicationDefault(),
});
(async () => {
  const user = await admin.auth().getUser(uid);
  const claims = { ...(user.customClaims || {}) };
  if (["revoke", "--revoke"].includes(process.argv[3])) delete claims.admin;
  else claims.admin = true;
  await admin.auth().setCustomUserClaims(uid, claims);
  console.log("Đã cập nhật quyền cho UID:", uid, "Đăng xuất và đăng nhập lại.");
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
