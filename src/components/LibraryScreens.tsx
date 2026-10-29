import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { Button, ErrorText, Field, Page, ui } from "./UI";
import SongRow from "./SongRow";
import { useAction } from "../hooks/useAction";
import {
  changePlaylistSong,
  deletePlaylist,
  savePlaylist,
} from "../services/libraryService";
import { confirmDelete } from "../utils/feedback";
export function LibraryScreen() {
  const { playlists, favoriteIds, followingIds } = useData();
  return (
    <Page title="Your Library">
      <Button
        title={`♥ Favorites (${favoriteIds.length})`}
        onPress={() => router.push("/favorites")}
      />
      <Button
        title={`♫ Playlists (${playlists.length})`}
        onPress={() => router.push("/playlists")}
      />
      <Text style={ui.muted}>
        Đang theo dõi {followingIds.length} nghệ sĩ. Dữ liệu thư viện thuộc tài
        khoản đã đăng nhập.
      </Text>
      <Button
        title="Profile & tài khoản"
        secondary
        onPress={() => router.push("/profile")}
      />
      <Button
        title="Giới thiệu Premium (demo)"
        secondary
        onPress={() => router.push("/premium")}
      />
    </Page>
  );
}
export function PlaylistsScreen() {
  const { user } = useAuth(),
    data = useData(),
    a = useAction();
  const [name, setName] = useState(""),
    [description, setDescription] = useState(""),
    [editing, setEditing] = useState<string | null>(null);
  return (
    <Page title="Your playlists">
      <Field label="Tên playlist" value={name} onChange={setName} />
      <Field label="Mô tả" value={description} onChange={setDescription} />
      <ErrorText message={a.error} />
      <Button
        title={editing ? "Lưu thay đổi" : "Tạo playlist"}
        disabled={a.busy}
        onPress={() =>
          void a.run(async () => {
            if (!user) return;
            await savePlaylist(user.uid, editing, name, description);
            setName("");
            setDescription("");
            setEditing(null);
          })
        }
      />
      {editing && (
        <Button
          title="Hủy sửa"
          secondary
          onPress={() => {
            setEditing(null);
            setName("");
            setDescription("");
          }}
        />
      )}
      {data.playlists.map((p) => (
        <View key={p.id} style={ui.card}>
          <Pressable
            onPress={() =>
              router.push({ pathname: "/playlist", params: { id: p.id } })
            }
          >
            <Text style={ui.heading}>{p.name} ›</Text>
            <Text style={ui.muted}>{p.description}</Text>
            <Text style={ui.small}>{p.songIds.length} ID bài hát</Text>
          </Pressable>
          <View style={ui.row}>
            <Button
              title="Sửa"
              secondary
              onPress={() => {
                setEditing(p.id);
                setName(p.name);
                setDescription(p.description);
              }}
            />
            <Button
              title="Xóa"
              secondary
              disabled={a.busy}
              onPress={() =>
                confirmDelete(
                  "Xóa playlist? Bài hát gốc không bị xóa.",
                  () =>
                    void a.run(async () => {
                      if (user) await deletePlaylist(user.uid, p.id);
                    }),
                )
              }
            />
          </View>
        </View>
      ))}
      {!data.playlists.length && (
        <Text style={ui.muted}>Bạn chưa có playlist.</Text>
      )}
    </Page>
  );
}
export function PlaylistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    data = useData(),
    { user } = useAuth(),
    a = useAction();
  const p = data.playlists.find((x) => x.id === id);
  if (!p)
    return (
      <Page title="Playlist">
        <Text style={ui.muted}>
          Không tìm thấy playlist của bạn hoặc đang tải dữ liệu.
        </Text>
        <Button
          title="Về danh sách"
          onPress={() => router.replace("/playlists")}
        />
      </Page>
    );
  const songs = p.songIds.flatMap((id) => {
    const song = data.songs.find((s) => s.id === id && s.active);
    return song ? [song] : [];
  });
  const unavailableIds = p.songIds.filter(
    (id) => !songs.some((song) => song.id === id),
  );
  const missing = p.songIds.length - songs.length;
  return (
    <Page title={p.name}>
      <Text style={ui.muted}>{p.description}</Text>
      <ErrorText message={a.error} />
      {songs.map((s) => (
        <SongRow
          key={s.id}
          song={s}
          queue={songs}
          onRemove={() =>
            void a.run(async () => {
              if (user) await changePlaylistSong(user.uid, p.id, s.id, false);
            })
          }
        />
      ))}
      {missing > 0 && (
        <Text style={ui.small}>
          {missing} bài không còn khả dụng. Bạn có thể gỡ các liên kết này bên
          dưới.
        </Text>
      )}
      {unavailableIds.map((songId) => (
        <Button
          key={songId}
          title={`Gỡ bài không khả dụng: ${songId}`}
          secondary
          disabled={a.busy}
          onPress={() =>
            void a.run(async () => {
              if (user) await changePlaylistSong(user.uid, p.id, songId, false);
            })
          }
        />
      ))}
      {!songs.length && (
        <Text style={ui.muted}>
          Chưa có bài khả dụng. Dùng nút + ở Home/Search để thêm.
        </Text>
      )}
      <Button title="Tìm bài để thêm" onPress={() => router.push("/search")} />
    </Page>
  );
}
export function FavoritesScreen() {
  const data = useData();
  const songs = data.songs.filter(
    (s) => s.active && data.favoriteIds.includes(s.id),
  );
  return (
    <Page title="Favorites">
      {songs.map((s) => (
        <SongRow key={s.id} song={s} queue={songs} />
      ))}
      {!songs.length && (
        <Text style={ui.muted}>
          Chưa có bài hát yêu thích khả dụng. Chọn trái tim cạnh bài hát để thêm
          hoặc xóa.
        </Text>
      )}
    </Page>
  );
}
