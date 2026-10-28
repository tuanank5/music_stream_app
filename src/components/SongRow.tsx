import React, { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import Artwork from "./Artwork";
import { Button, ErrorText, ui } from "./UI";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { usePlayer } from "../contexts/PlayerContext";
import { useAction } from "../hooks/useAction";
import { Song } from "../types/domain";
import { changePlaylistSong, setFavorite } from "../services/libraryService";
import { formatDuration } from "../utils/validation";
export default function SongRow({
  song,
  queue,
  onRemove,
}: {
  song: Song;
  queue?: Song[];
  onRemove?: () => void;
}) {
  const { user } = useAuth(),
    data = useData(),
    player = usePlayer(),
    action = useAction();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginVertical: 5 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Pressable
          onPress={() => {
            player.play(song, queue);
            router.push("/player");
          }}
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
          accessibilityLabel={"Phát " + song.title}
        >
          <Artwork uri={song.cover} size={49} />
          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={1}
              style={{ fontWeight: "700", fontSize: 15, color: "#22242a" }}
            >
              {song.title}
            </Text>
            <Text numberOfLines={1} style={ui.small}>
              {song.artist} · {formatDuration(song.durationSeconds)}
            </Text>
          </View>
        </Pressable>
        <Pressable
          disabled={action.busy}
          onPress={() => {
            if (user)
              void action.run(() =>
                setFavorite(
                  user.uid,
                  song.id,
                  !data.favoriteIds.includes(song.id),
                ),
              );
          }}
          accessibilityLabel="Yêu thích"
        >
          <Text style={{ fontSize: 23, color: "#087e78", padding: 4 }}>
            {data.favoriteIds.includes(song.id) ? "♥" : "♡"}
          </Text>
        </Pressable>
        <Pressable
          onPress={() =>
            router.push({ pathname: "/song", params: { id: song.id } })
          }
          accessibilityLabel="Chi tiết"
        >
          <Text style={{ fontSize: 24, padding: 5 }}>⋯</Text>
        </Pressable>
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityLabel="Thêm vào playlist"
        >
          <Text style={{ fontSize: 24, padding: 5 }}>＋</Text>
        </Pressable>
        {onRemove && (
          <Pressable onPress={onRemove}>
            <Text style={ui.danger}>×</Text>
          </Pressable>
        )}
      </View>
      <ErrorText message={!open ? action.error : ""} />
      <Modal
        visible={open}
        transparent
        onRequestClose={() => setOpen(false)}
        animationType="fade"
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#0008",
            justifyContent: "center",
            padding: 25,
          }}
        >
          <View
            style={{ backgroundColor: "white", borderRadius: 18, padding: 20 }}
          >
            <Text style={ui.heading}>Thêm vào playlist</Text>
            <Text style={ui.muted}>{song.title}</Text>
            <ErrorText message={action.error} />
            {data.playlists.slice(0, 10).map((p) => (
              <Button
                key={p.id}
                title={p.name}
                disabled={action.busy}
                onPress={() => {
                  if (user)
                    void action.run(async () => {
                      await changePlaylistSong(user.uid, p.id, song.id, true);
                      setOpen(false);
                    });
                }}
              />
            ))}
            {!data.playlists.length && (
              <Button
                title="Tạo playlist trước"
                onPress={() => {
                  setOpen(false);
                  router.push("/playlists");
                }}
              />
            )}
            {data.playlists.length > 10 && (
              <Text style={ui.small}>
                Hiển thị 10 playlist đầu trong hộp chọn.
              </Text>
            )}
            <Button title="Đóng" secondary onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}
