const assert = require('node:assert/strict');
const artists = require('./artists.json');
const songs = require('./songs.json');
function validate() {
  assert.equal(Object.keys(artists).length, 20, 'Cần đủ 20 nghệ sĩ');
  assert.equal(Object.keys(songs).length, 100, 'Cần đủ 100 bài hát');
  const artistKeys = ['name','imageUrl','biography','active'].sort();
  const songKeys = ['title','artist','artistId','album','coverUrl','audioUrl','audioKey','durationSeconds','lyrics','active'].sort();
  const counts = {};
  function str(v, max) { assert.equal(typeof v,'string'); assert.ok(v.length <= max); }
  function url(v) { str(v,2048); assert.ok(v === '' || /^https:\/\/.+/.test(v)); }
  for (const [id,a] of Object.entries(artists)) {
    assert.match(id,/^demo100-artist-\d{3}$/);
    assert.deepEqual(Object.keys(a).sort(),artistKeys);
    str(a.name,150); assert.ok(a.name.trim()); url(a.imageUrl);
    str(a.biography,4000); assert.equal(a.active,true); counts[id]=0;
  }
  for (const [id,s] of Object.entries(songs)) {
    assert.match(id,/^demo100-song-\d{3}$/);
    assert.deepEqual(Object.keys(s).sort(),songKeys);
    str(s.title,150); assert.ok(s.title.trim()); str(s.artist,150);
    str(s.artistId,128); assert.ok(artists[s.artistId],`artistId không tồn tại: ${s.artistId}`);
    assert.equal(s.artist,artists[s.artistId].name); counts[s.artistId]++;
    str(s.album,150); url(s.coverUrl); url(s.audioUrl);
    assert.ok(['demo1','demo2','demo3'].includes(s.audioKey));
    assert.equal(s.durationSeconds,12); str(s.lyrics,12000); assert.equal(s.active,true);
  }
  for (const n of Object.values(counts)) assert.equal(n,5,'Mỗi nghệ sĩ có 5 bài');
  assert.equal(new Set(Object.values(songs).map(s=>s.title)).size,100);
  return {artists:20,songs:100,relationships:100,songsPerArtist:5};
}
if (require.main === module) console.log('Dữ liệu hợp lệ:',validate());
module.exports = {validate,artists,songs};
