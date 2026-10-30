// node update-genres.cjs --project PROJECT --file genres.json [--apply --backup-dir OUTSIDE_PROJECT]
const fs=require('node:fs'),path=require('node:path'),admin=require('firebase-admin');
const args=process.argv.slice(2),option=n=>args[args.indexOf(n)+1];
if(!args.includes('--project')||!args.includes('--file'))
    throw new Error('Cần --project PROJECT --file genres.json');
const projectId=option('--project'),data=JSON.parse(fs.readFileSync(option('--file'),'utf8'));
for(const[id,genres]of Object.entries(data))
    if(!id||id.includes('/')||!Array.isArray(genres)||!genres.length||genres.length>10||genres.some(g=>typeof g!=='string'||!g.trim()||g.length>50))
        throw new Error('Genre không hợp lệ: '+id);
    admin.initializeApp({projectId,...(process.env.FIRESTORE_EMULATOR_HOST?{}:
        {credential:admin.credential.applicationDefault()})});
        const db=admin.firestore();
        (async()=>{
            const entries=Object.entries(data),backup=[];
            for(const[id,genres]of entries){
                const s=await db.doc('songs/'+id).get();if(!s.exists)
                    throw new Error('Không tìm thấy '+id);
                backup.push({songId:id,genre:s.data().genre??null});
                console.log(id,':',s.data().genre,'=>',genres);}
                if(!args.includes('--apply')){
                    console.log('Dry run. Chưa ghi Firestore.');
                    return;
                }
                if(!args.includes('--backup-dir'))
                    throw new Error('--apply cần --backup-dir ngoài project');
                const dir=path.resolve(option('--backup-dir'));
                fs.mkdirSync(dir,{recursive:true});
                fs.writeFileSync(path.join(dir,'genres-backup-'+Date.now()+'.json'),
                JSON.stringify({projectId,entries:backup},null,2));
                for(let i=0;i<entries.length;i+=350){
                    const b=db.batch();
                    for(const[id,genre]of entries.slice(i,i+350))
                        b.update(db.doc('songs/'+id),{
                    genre:[...new Set(genre.map(g=>g.trim()))]});
                    await b.commit();}
                    console.log('Đã cập nhật genre.');
                })
                ().catch(e=>{
                    console.error(e.message);process.exitCode=1
                })
                .finally(()=>db.terminate());
