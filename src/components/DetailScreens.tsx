import React from "react";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { usePlayer } from "../contexts/PlayerContext";
import { useAction } from "../hooks/useAction";
import { Page, Button, ErrorText, ui } from "./UI";
import Artwork from "./Artwork";
import SongRow from "./SongRow";
import { setFollow } from "../services/libraryService";
import { formatDuration } from "../utils/validation";
export function ArtistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    data = useData(),
    { user } = useAuth(),
    a = useAction();
  const artist = data.artists.find((x) => x.id === id && x.active);
  if (!artist)
    return (
      <Page title="Artist">
        <Text>Nghệ sĩ không còn khả dụng hoặc đang tải.</Text>
      </Page>
    );
  const songs = data.songs.filter((s) => s.active && s.artistId === id);
  return (
    <Page title={artist.name}>
      <View style={{ alignItems: "center" }}>
        <Artwork uri={artist.imageUrl} size={135} radius={68} />
      </View>
      <Text style={ui.muted}>{artist.biography}</Text>
      <ErrorText message={a.error} />
      <Button
        title={
          data.followingIds.includes(artist.id) ? "Bỏ theo dõi" : "Theo dõi"
        }
        disabled={a.busy}
        onPress={() =>
          void a.run(async () => {
            if (user)
              await setFollow(
                user.uid,
                artist.id,
                !data.followingIds.includes(artist.id),
              );
          })
        }
      />
      <Text style={ui.heading}>Bài hát</Text>
      {songs.map((s) => (
        <SongRow key={s.id} song={s} queue={songs} />
      ))}
      {!songs.length && <Text style={ui.muted}>Chưa có bài hát.</Text>}
    </Page>
  );
}
export function SongDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    data = useData(),
    player = usePlayer();
  const song = data.songs.find((s) => s.id === id && s.active);
  if (!song)
    return (
      <Page title="Song">
        <Text>Bài hát không còn khả dụng hoặc đang tải.</Text>
      </Page>
    );
  return (
    <Page title={song.title}>
      <Artwork uri={song.cover} size={220} />
      <Text style={ui.heading}>{song.artist}</Text>
      <Text style={ui.muted}>
        Album: {song.album || "Chưa có"}
        {"\n"}Thời lượng dự kiến: {formatDuration(song.durationSeconds)}
      </Text>
      <Button
        title="Phát bài hát"
        onPress={() => {
          player.play(
            song,
            data.songs.filter((s) => s.active),
          );
          router.push("/player");
        }}
      />
      {song.artistId ? (
        <Button
          title="Xem nghệ sĩ"
          secondary
          onPress={() =>
            router.push({
              pathname: "/artist",
              params: { id: song.artistId },
            })
          }
        />
      ) : null}
      <Button
        title="Lời bài hát"
        secondary
        onPress={() =>
          router.push({ pathname: "/lyrics", params: { id: song.id } })
        }
      />
    </Page>
  );
}
export function LyricsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    data = useData();
  const song = data.songs.find((s) => s.id === id && s.active);
  return (
    <Page title="Lyrics">
      <Text style={ui.heading}>{song?.title ?? "Không tìm thấy bài hát"}</Text>
      <Text selectable style={[ui.muted, { lineHeight: 29 }]}>
        {song?.lyrics || "Chưa có lời bài hát cho bài này."}
      </Text>
    </Page>
  );
}
export function ChartsScreen() {
  const data = useData();
  const songs = data.songs
    .filter((s) => s.active)
    .sort((a, b) => a.title.localeCompare(b.title));
  return (
    <Page title="Danh mục bài hát">
      <Text style={ui.muted}>
        Sắp xếp theo tên. Chưa có dữ liệu lượt nghe để xây dựng bảng xếp hạng
        thật.
      </Text>
      {songs.map((s) => (
        <SongRow key={s.id} song={s} queue={songs} />
      ))}
      {!songs.length && <Text style={ui.muted}>Chưa có dữ liệu.</Text>}
    </Page>
  );
}
export function PremiumScreen() {
  return (
    <Page title="Premium — giao diện giới thiệu">
      <Text style={ui.muted}>
        Phiên bản học tập này không có thanh toán, gói thuê bao hoặc tải
        offline. Bạn không cần mua Premium để sử dụng các chức năng MVP.
      </Text>
      <Button
        title="Tiếp tục nghe nhạc"
        onPress={() => router.replace("/home")}
      />
    </Page>
  );
}
