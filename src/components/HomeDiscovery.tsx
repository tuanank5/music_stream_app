import React from "react";
import { Pressable, ScrollView, Text } from "react-native";
import { router } from "expo-router";

import { useData } from "../contexts/DataContext";
import { usePlayer } from "../contexts/PlayerContext";
import { useCharts } from "../hooks/useCharts";
import { popularArtists } from "../utils/discovery";

import {
  suggestSongs,
  trendingAlbums,
} from "../utils/recommendations";

import {
  ArtistCard,
  ChartCard,
  SectionHeading,
} from "./discovery/DiscoveryCards";

import Artwork from "./Artwork";
import { ErrorText, Loading, ui } from "./UI";

export default function HomeDiscovery() {
  const data = useData();
  const player = usePlayer();
  const charts = useCharts();

  const suggestions = suggestSongs(
    data.songs,
    data.history,
  );

  const albums = trendingAlbums(
    data.songs,
    data.albums,
  );

  const artistIds = new Set(
    data.songs
      .filter(
        song =>
          song.active &&
          song.isPublished &&
          song.visibility === "public",
      )
      .map(song => song.artistId),
  );

  const artists = popularArtists(
    data.artists,
    data.songs,
  ).filter(artist => artistIds.has(artist.id));

  return (
    <>
      <SectionHeading title="Suggestions for you" />

      {data.loading ? (
        <Loading />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {suggestions.map(song => (
            <Pressable
              key={song.id}
              style={{ width: 145, marginRight: 12 }}
              onPress={() => {
                player.play(song, suggestions);
                router.push("/player");
              }}
            >
              <Artwork uri={song.cover} size={145} />

              <Text
                numberOfLines={1}
                style={{
                  fontWeight: "700",
                  marginTop: 8,
                }}
              >
                {song.title}
              </Text>

              <Text style={ui.small}>
                {song.artist}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <SectionHeading
        title="Charts"
        onPress={() => router.push("/charts")}
      />

      <ErrorText message={charts.error} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {charts.charts.map(chart => (
          <ChartCard key={chart.id} chart={chart} />
        ))}
      </ScrollView>

      {!charts.loading && !charts.charts.length ? (
        <Text style={ui.muted}>
          Chưa có bài hát công khai theo genre.
        </Text>
      ) : null}

      <SectionHeading title="Trending albums" />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {albums.map(album => (
          <Pressable
            key={album.id}
            style={{ width: 145, marginRight: 12 }}
            onPress={() =>
              router.push({
                pathname: "/album",
                params: { id: album.id },
              })
            }
          >
            <Artwork
              uri={album.coverUrl}
              size={145}
            />

            <Text
              numberOfLines={1}
              style={{
                fontWeight: "700",
                marginTop: 8,
              }}
            >
              {album.title}
            </Text>

            <Text style={ui.small}>
              {album.totalPlayCount} lượt nghe
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {!albums.length ? (
        <Text style={ui.muted}>
          Chưa có bài hát liên kết với album.
        </Text>
      ) : null}

      <SectionHeading title="Popular artists" />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {artists.map(artist => (
          <ArtistCard
            key={artist.id}
            artist={artist}
          />
        ))}
      </ScrollView>

      {data.errors.map(error => (
        <ErrorText
          key={error}
          message={error}
        />
      ))}
    </>
  );
}