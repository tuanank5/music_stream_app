function mapSong(id, x, profiles, albums) {
  const artist = profiles.get(x.artistId);
  return {
    id,
    title: String(x.title || ""),
    artistId: String(x.artistId || ""),
    artist: x.artistNames?.join(", ") || artist?.displayName || "",
    artistNames: x.artistNames || [],
    albumId: x.albumId || "",
    album: albums.get(x.albumId)?.title || "",
    cover: x.coverUrl || "",
    audioUrl: x.audioUrl || "",
    audioKey: x.audioKey || "",
    durationSeconds: Number(x.durationSeconds) || 0,
    lyrics: x.lyric || "",
    genre: Array.isArray(x.genre) ? x.genre : [],
    playCount: Number(x.playCount) || 0,
    active: x.active === true,
    isPublished: x.isPublished === true,
    visibility: x.visibility,
  };
}
const mapArtist = (id, x) => ({
  id,
  name: x.displayName || "",
  imageUrl: x.avatarUrl || "",
  biography: x.biography || "",
  active: x.active !== false,
  followerCount: Number(x.followerCount) || 0,
  followingCount: Number(x.followingCount) || 0,
});
const mapAlbum = (id, x) => ({
  id,
  title: x.title || "",
  artistId: x.artistId || "",
  artistName: x.artistName || "",
  coverUrl: x.coverUrl || "",
  isPublished: x.isPublished === true,
});

module.exports = { mapSong, mapArtist, mapAlbum };
