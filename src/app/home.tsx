import React from "react";
import Guard from "../components/Guard";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { usePlayer } from "../contexts/PlayerContext";
import Artwork from "../components/Artwork";
import SongRow from "../components/SongRow";
import { Button, Loading, Page, ui } from "../components/UI";

export default function Route() {
  const { user, isAdmin } = useAuth(),
    data = useData(),
    player = usePlayer();
  const songs = data.songs.filter((s) => s.active);
  return (
    <Guard>
      <Page>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View>
            <Text style={ui.muted}>Xin chào,</Text>
            <Text style={ui.title}>{user?.displayName || "Music lover"}</Text>
          </View>
          <Pressable
            onPress={() => router.push("/profile")}
            accessibilityLabel="Hồ sơ"
          >
            <Artwork uri={user?.photoURL ?? ""} size={42} radius={21} />
          </Pressable>
        </View>
        <Button
          title="⌕ Tìm bài hát, nghệ sĩ, album"
          secondary
          onPress={() => router.push("/search")}
        />
        <Text style={ui.heading}>Suggestions for you</Text>
        {data.loading ? (
          <Loading />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {songs.slice(0, 8).map((song) => (
              <Pressable
                key={song.id}
                style={{ width: 145, marginRight: 12 }}
                onPress={() => {
                  player.play(song, songs);
                  router.push("/player");
                }}
              >
                <Artwork uri={song.cover} size={145} />
                <Text
                  numberOfLines={1}
                  style={{ fontWeight: "700", marginTop: 8 }}
                >
                  {song.title}
                </Text>
                <Text style={ui.small}>{song.artist}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
        {!data.loading && !songs.length && (
          <Text style={ui.muted}>
            Chưa có bài hát. Thêm dữ liệu mẫu theo START_HERE.md hoặc dùng tài
            khoản admin.
          </Text>
        )}
        <View style={[ui.card, { backgroundColor: "#dcefeb" }]}>
          <Text style={ui.heading}>Khám phá danh mục</Text>
          <Text style={ui.muted}>
            Duyệt các bài hát đang hoạt động. Đây chưa phải bảng xếp hạng theo
            lượt nghe.
          </Text>
          <Button
            title="Xem danh sách"
            onPress={() => router.push("/charts")}
          />
        </View>
        <Text style={ui.heading}>Popular artists</Text>
        <ScrollView horizontal>
          {data.artists
            .filter((a) => a.active)
            .map((artist) => (
              <Pressable
                key={artist.id}
                style={{ alignItems: "center", marginRight: 16, width: 95 }}
                onPress={() =>
                  router.push({
                    pathname: "/artist",
                    params: { id: artist.id },
                  })
                }
              >
                <Artwork uri={artist.imageUrl} size={85} radius={43} />
                <Text numberOfLines={1}>{artist.name}</Text>
              </Pressable>
            ))}
        </ScrollView>
        <Text style={ui.heading}>Bài hát</Text>
        {songs.slice(0, 10).map((song) => (
          <SongRow key={song.id} song={song} queue={songs} />
        ))}
        {isAdmin && (
          <Button
            title="Quản lý danh mục"
            secondary
            onPress={() => router.push("/admin")}
          />
        )}
      </Page>
    </Guard>
  );
}
