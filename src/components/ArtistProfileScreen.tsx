import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import { useData } from "../contexts/DataContext";
import { usePlayer } from "../contexts/PlayerContext";
import {
  artistAlbums,
  artistSongs,
  shuffleSongs,
} from "../utils/discovery";

import { Page, Loading, ui } from "./UI";
import Artwork from "./Artwork";
import SongRow from "./SongRow";

import {
  ArtistAvatar,
  BackButton,
  FollowButton,
  SectionHeading,
  discoveryStyles as ds,
} from "./discovery/DiscoveryCards";

export default function ArtistProfileScreen() {
  const params = useLocalSearchParams<{
    id?: string | string[];
  }>();

  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const data = useData();
  const player = usePlayer();

  const [selection, setSelection] = useState({
    artistId: "",
    album: "",
  });

  const artist = data.artists.find(
    (item) => item.id === id && item.active
  );

  const allSongs = artistSongs(data.songs, id ?? "");
  const albums = artistAlbums(allSongs);

  const selectedAlbum =
    selection.artistId === id ? selection.album : "";

  const songs = selectedAlbum
    ? allSongs.filter((song) => song.album.trim() === selectedAlbum)
    : allSongs;

  function play(shuffle = false) {
    const queue = shuffle ? shuffleSongs(songs) : songs;

    if (queue.length === 0) return;

    player.play(queue[0], queue);
    router.push("/player");
  }

  if (!artist) {
    return (
      <Page title="Artist">
        <View style={ds.content}>
          <BackButton />

          {data.loading ? (
            <Loading />
          ) : (
            <Text style={ds.muted}>
              Không tìm thấy nghệ sĩ hoặc nghệ sĩ chưa được tải.
            </Text>
          )}
        </View>
      </Page>
    );
  }

  return (
    <Page>
      <View style={[ds.content, { maxWidth: 760 }]}>
        <BackButton />

        <View style={{ alignItems: "center", paddingTop: 8 }}>
          <ArtistAvatar artist={artist} size={156} />

          <Text
            style={[
              ds.title,
              {
                marginTop: 16,
                textAlign: "center",
              },
            ]}
          >
            {artist.name}
          </Text>

          <Text style={[ds.muted, { marginTop: 5 }]}>
            {artist.followerCount ?? 0} followers ·{" "}
            {allSongs.length} bài hát ·{" "}
            {albums.length} album
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 18,
          }}
        >
          <FollowButton artistId={artist.id} />

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 20,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Phát ngẫu nhiên"
              disabled={songs.length === 0}
              onPress={() => play(true)}
              style={{
                padding: 8,
                opacity: songs.length ? 1 : 0.35,
              }}
            >
              <Ionicons
                name="shuffle"
                size={26}
                color="#777e89"
              />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Phát tất cả"
              disabled={songs.length === 0}
              onPress={() => play()}
              style={[
                ds.roundPlay,
                { opacity: songs.length ? 1 : 0.35 },
              ]}
            >
              <Ionicons
                name="play"
                size={25}
                color="white"
                style={{ marginLeft: 3 }}
              />
            </Pressable>
          </View>
        </View>

        <SectionHeading title={selectedAlbum || "Popular"} />

        {selectedAlbum ? (
          <Pressable
            onPress={() =>
              setSelection({
                artistId: artist.id,
                album: "",
              })
            }
          >
            <Text style={ui.link}>
              ← Tất cả bài hát của nghệ sĩ
            </Text>
          </Pressable>
        ) : null}

        {songs.map((song) => (
          <SongRow
            key={song.id}
            song={song}
            queue={songs}
          />
        ))}

        {songs.length === 0 ? (
          <Text style={ds.muted}>
            Nghệ sĩ này chưa có bài hát.
          </Text>
        ) : null}

        <SectionHeading title="Albums" />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {albums.map((album) => (
            <Pressable
              key={album.name}
              accessibilityRole="button"
              accessibilityLabel={`Xem album ${album.name}`}
              onPress={() =>
                setSelection({
                  artistId: artist.id,
                  album: album.name,
                })
              }
              style={{
                width: 140,
                marginRight: 14,
              }}
            >
              <Artwork uri={album.cover} size={140} />

              <Text
                numberOfLines={2}
                style={{
                  fontWeight: "700",
                  marginTop: 8,
                  color: "#242930",
                }}
              >
                {album.name}
              </Text>

              <Text style={ds.muted}>
                {album.songs.length} bài hát
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {albums.length === 0 ? (
          <Text style={ds.muted}>
            Chưa có thông tin album.
          </Text>
        ) : null}

        <SectionHeading title="About" />

        <Text
          style={[
            ds.muted,
            {
              fontSize: 14,
              lineHeight: 24,
            },
          ]}
        >
          {artist.biography.trim() ||
            "Nghệ sĩ chưa cập nhật phần giới thiệu."}
        </Text>
      </View>
    </Page>
  );
}