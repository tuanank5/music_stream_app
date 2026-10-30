import React from "react";
import Guard from "../components/Guard";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import Artwork from "../components/Artwork";
import SongRow from "../components/SongRow";
import { Button, Loading, Page,ErrorText, ui } from "../components/UI";
import HomeDiscovery from "../components/HomeDiscovery";

export default function Route() {
  const { user, isAdmin } = useAuth();
  const data = useData();

  const songs = data.songs.filter(
    song =>
      song.active &&
      song.isPublished &&
      song.visibility === "public",
  );

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
        {/* <Text style={ui.heading}>Suggestions for you</Text>
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

        <SectionHeading
              title="Charts"
              onPress={() => router.push("/charts")}
            />

            <ErrorText
              message={charts.error ? `Charts: ${charts.error}` : ""}
            />

            {charts.loading ? (
              <Loading />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
              >
                {charts.charts.map((chart) => (
                  <ChartCard
                    key={chart.id}
                    chart={chart}
                  />
                ))}
              </ScrollView>
            )}

            {!charts.loading &&
            !charts.error &&
            charts.charts.length === 0 ? (
              <Text style={ui.muted}>
                Chưa có chart. Thêm dữ liệu vào collection charts.
              </Text>
            ) : null}

            <SectionHeading title="Popular artists" />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 6 }}
            >
              {artists.map((artist) => (
                <ArtistCard
                  key={artist.id}
                  artist={artist}
                />
              ))}
              </ScrollView>
            {artists.length === 0 ? (
              <Text style={ui.muted}>
                Chưa có nghệ sĩ hoạt động.
              </Text>
            ) : null} */}
            <HomeDiscovery />
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
