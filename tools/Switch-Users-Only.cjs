// Run from tools with Firebase Admin. Default: read-only preview.
const fs = require('node:fs');
const path = require('node:path');
const admin = require('firebase-admin');
const args = process.argv.slice(2);
function option(name) {
  const i = args.indexOf(name);
  if (i < 0 || !args[i + 1] || args[i + 1].startsWith('--')) return '';
  return args[i + 1];
}
const projectId = option('--project');
if (!projectId) throw new Error('Thiếu --project PROJECT_ID');
admin.initializeApp({projectId, ...(process.env.FIRESTORE_EMULATOR_HOST ? {} : {credential:admin.credential.applicationDefault()})});
const db = admin.firestore();
function encode(v) {
  if (v instanceof admin.firestore.Timestamp) return {__firestoreType:'timestamp',seconds:v.seconds,nanoseconds:v.nanoseconds};
  if (v instanceof admin.firestore.GeoPoint) return {__firestoreType:'geopoint',latitude:v.latitude,longitude:v.longitude};
  if (v instanceof admin.firestore.DocumentReference) return {__firestoreType:'reference',path:v.path};
  if (Buffer.isBuffer(v)) return {__firestoreType:'bytes',value:v.toString('base64')};
  if (Array.isArray(v)) return v.map(encode);
  if (v && typeof v==='object') return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,encode(x)]));
  return v;
}
async function main() {
  const [users, profiles] = await Promise.all(['users','publicProfiles'].map(c=>db.collection(c).get()));
  const byId = new Map(users.docs.map(d=>[d.id,d.data()]));
  const writes = [];
  const publicById = new Map(profiles.docs.map(d=>[d.id,d.data()]));
  for (const uid of new Set([...byId.keys(),...publicById.keys()])) {
    const old = byId.get(uid) || {}, p = publicById.get(uid) || {};
    const now=admin.firestore.Timestamp.now();
    const defaults={
      userId:uid, email:'', createdAt:now, updatedAt:now,
      displayName:p.displayName || 'Music lover',
      avatarUrl:p.avatarUrl ?? old.photoURL ?? '', biography:p.biography || '',
      followerCount:p.followerCount ?? 0, followingCount:p.followingCount ?? 0,
      active:p.active !== false,
    };
    const fields={};
    for(const [key,value] of Object.entries(defaults)) if(old[key]===undefined) fields[key]=value;
    if (Object.keys(fields).length) writes.push({path:'users/'+uid,data:fields});
  }
  const remove = args.includes('--delete-public-profiles');
  console.log({projectId,users:users.size,publicProfiles:profiles.size,usersToFill:writes.length,deletePublicProfiles:remove});
  if (!args.includes('--apply')) {console.log('DRY RUN: chưa ghi/xóa. --apply cần --backup-dir ngoài project. Chỉ thêm --delete-public-profiles sau khi code + Rules mới chạy được.');return;}
  const folder = option('--backup-dir');
  if (!folder) throw new Error('--apply bắt buộc --backup-dir ngoài project');
  const dir = path.resolve(folder), project = path.resolve(__dirname,'..'), relative = path.relative(project,dir);
  if (!relative || (!relative.startsWith('..'+path.sep) && relative !== '..' && !path.isAbsolute(relative))) throw new Error('Backup phải ở ngoài project.');
  fs.mkdirSync(dir,{recursive:true});
  const documents=[];
  async function walk(ref) {
    const s=await ref.get(); if(s.exists) documents.push({path:ref.path,data:encode(s.data())});
    for(const sub of await ref.listCollections()) for(const child of await sub.listDocuments()) await walk(child);
  }
  for(const root of ['users','publicProfiles']) for(const ref of await db.collection(root).listDocuments()) await walk(ref);
  const file=path.join(dir,'users-only-backup-'+Date.now()+'.json');
  fs.writeFileSync(file,JSON.stringify({projectId,documents,plannedPaths:writes.map(x=>x.path)},null,2),{flag:'wx',mode:0o600});
  console.log('Đã backup:',file);
  for(let i=0;i<writes.length;i+=200){const b=db.batch();for(const w of writes.slice(i,i+200))b.set(db.doc(w.path),w.data,{merge:true});await b.commit();}
  // No root marker collection is created by this conversion.
  if(remove) await db.recursiveDelete(db.collection('publicProfiles'));
  console.log('Xong. Không sửa Auth, songs, albums, playlist, favorites, following, history.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.terminate());
