const PASSWORD = "LocalMusic123!";
const { demoTrack } = require("./demo-audio.cjs");

function buildFixtures() {
  const now = new Date("2026-11-01T12:00:00Z");
  const users = [
    { uid: "local-listener", displayName: "Người nghe local" },
    { uid: "local-member", displayName: "Thành viên local" },
    ...Array.from({ length: 24 }, (_, i) => ({
      uid: `local-artist-${String(i + 1).padStart(2, "0")}`,
      displayName: `${["An", "Bình", "Chi", "Dương"][i % 4]} ${i + 1}`,
    })),
  ];
  const documents = [];
  const relations = users.flatMap((user, i) =>
    Array.from({ length: i % 5 }, (_, j) => ({
      uid: user.uid,
      target: users[2 + j].uid,
    })).filter((r) => r.uid !== r.target),
  );
  relations.push({ uid: "local-listener", target: "local-artist-01" });
  for (const user of users) {
    user.email = `${user.uid}@example.test`;
    documents.push({
      path: `users/${user.uid}`,
      data: {
        displayName: user.displayName,
        email: user.email,
        avatarUrl: "",
        avatarPublicId: null,
        biography: "Hồ sơ thử nghiệm local.",
        active: true,
        followerCount: relations.filter((r) => r.target === user.uid).length,
        followingCount: relations.filter((r) => r.uid === user.uid).length,
        createdAt: now,
        updatedAt: now,
      },
    });
  }
  for (const relation of relations)
    documents.push({
      path: `users/${relation.uid}/following/${relation.target}`,
      data: { followedAt: now },
    });
  for (let i = 0; i < 12; i++)
    documents.push({
      path: `albums/local-album-${i}`,
      data: {
        title: `Album local ${i + 1}`,
        artistId: users[2 + i].uid,
        coverUrl: "",
        coverPublicId: null,
        description: "",
        isPublic: true,
        createdAt: now,
        updatedAt: now,
        releaseDate: now,
      },
    });
  for (let i = 0; i < 120; i++) {
    const artist = users[2 + (i % 24)];
    const albumId = i % 24 < 12 ? `local-album-${i % 24}` : null;
    documents.push({
      path: `songs/local-song-${String(i).padStart(3, "0")}`,
      data: {
        title: `${["Đường về", "Bình yên", "Nắng mới", "Một ngày"][i % 4]} ${i + 1}`,
        artistId: artist.uid,
        artistNames: [artist.displayName],
        albumId,
        coverUrl: "",
        coverPublicId: null,
        audioPublicId: null,
        ...demoTrack(i),
        genre: i < 60 ? ["Pop"] : [["Pop", "Acoustic", "Indie", "Rock"][i % 4]],
        lyric: "Lời bài hát thử nghiệm.",
        description: "",
        isPublic: true,
        active: true,
        playCount: (i * 37) % 1000,
        createdAt: now,
        updatedAt: now,
        releaseDate: now,
      },
    });
  }
  const template = documents.find(
    (d) => d.path === "songs/local-song-000",
  ).data;
  for (const label of ["private", "unlisted", "followers"])
    documents.push({
      path: `songs/local-${label}`,
      data: {
        ...template,
        title: `Local ${label}`,
        isPublic: false,
      },
    });
  for (let i = 0; i < 160; i++) {
    const time = new Date(now.getTime() - i * 120000);
    documents.push({
      path: `users/local-listener/history/local-session-${String(i).padStart(3, "0")}`,
      data: {
        songId: `local-song-${String(i % 80).padStart(3, "0")}`,
        playedAt: time,
        startedAt: new Date(time.getTime() - 30000),
        progressSeconds: Math.min(30, demoTrack(i % 80).durationSeconds / 2),
        durationSeconds: demoTrack(i % 80).durationSeconds,
        listenedSeconds: Math.min(30, demoTrack(i % 80).durationSeconds / 2),
        completed: false,
        counted: false,
      },
    });
  }
  for (let i = 0; i < 25; i++)
    documents.push({
      path: `users/local-listener/favorites/local-song-${String(i).padStart(3, "0")}`,
      data: {
        favoritedAt: now,
      },
    });
  documents.push({
    path: "users/local-listener/playlists/local-playlist",
    data: {
      name: "Playlist local",
      description: "Dữ liệu thử",
      isPublic: false,
      songIds: ["local-song-000", "local-song-001"],
      createdAt: now,
      updatedAt: now,
    },
  });
  documents.push({
    path: "posts/local-post",
    data: {
      ownerId: "local-artist-01",
      content: "Bài đăng local",
      songId: "local-song-000",
      active: true,
      createdAt: now,
      updatedAt: now,
    },
  });
  documents.push({
    path: "posts/local-post/comments/local-comment",
    data: {
      ownerId: "local-listener",
      content: "Bình luận local",
      createdAt: now,
      updatedAt: now,
    },
  });
  return { users, documents };
}

module.exports = { buildFixtures, PASSWORD };
