// Chạy bằng Node trên máy quản trị. Không import file này vào src/app.
const { validate, artists, songs } = require('./dataset100/validate.cjs');
async function main() {
  console.log('Kiểm tra schema:', validate());
  if (process.argv.includes('--dry-run')) {
    console.log('Chỉ kiểm tra JSON. Chưa kết nối hoặc ghi Firestore.');
    return;
  }
  const args = process.argv.slice(2);
  const index = args.indexOf('--project');
  const projectId = index >= 0 ? args[index+1] : undefined;
  if (!projectId || projectId.startsWith('--') || !args.includes('--confirm')) {
    throw new Error('Cách chạy: node seed-100.cjs --project PROJECT_ID --confirm ; hoặc --dry-run');
  }
  if (!process.env.FIRESTORE_EMULATOR_HOST && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error('Đặt GOOGLE_APPLICATION_CREDENTIALS trỏ tới service-account JSON bên ngoài source.');
  }
  const admin = require('firebase-admin');
  admin.initializeApp(process.env.FIRESTORE_EMULATOR_HOST
    ? {projectId}
    : {projectId,credential:admin.credential.applicationDefault()});
  const db = admin.firestore();
  const entries = [
    ...Object.entries(artists).map(([id,data])=>({path:`artists/${id}`,data})),
    ...Object.entries(songs).map(([id,data])=>({path:`songs/${id}`,data})),
  ];
  console.log('Project đích:',projectId);
  const result = await db.runTransaction(async transaction => {
    // Đọc tất cả trước khi ghi. create() không ghi đè document đã có.
    const snapshots = await transaction.getAll(...entries.map(x=>db.doc(x.path)));
    const counts = {createdArtists:0,createdSongs:0,skipped:0};
    entries.forEach((entry,i)=>{
      if (snapshots[i].exists) {counts.skipped++;return;}
      transaction.create(db.doc(entry.path),entry.data);
      if(entry.path.startsWith('artists/')) counts.createdArtists++;
      else counts.createdSongs++;
    });
    return counts;
  });
  console.log('Hoàn tất:',result);
  console.log('Document đã tồn tại được giữ nguyên. Có thể chạy lại an toàn để bổ sung document thiếu.');
  await db.terminate();
}
main().catch(error=>{console.error('Không nhập được dữ liệu:',error.message);process.exitCode=1;});
