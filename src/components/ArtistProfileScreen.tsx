import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useWindowDimensions } from "react-native";
import { ScrollView, XStack, YStack } from "tamagui";
import { useCatalogData } from "../contexts/DataContext";
import { usePlayerActions } from "../contexts/PlayerContext";
import { artistAlbums, artistSongs, shuffleSongs } from "../utils/discovery";
import Artwork from "./Artwork";
import SongRow from "./SongRow";
import {
  Action,
  AppIcon,
  AppText,
  IconButton,
  ListPage,
  Loading,
  Page,
  PageTitle,
  TextLink,
  MediaTitle,
  MediaSubtitle,
} from "./UI";
import {
  ArtistAvatar,
  BackButton,
  FollowButton,
  SectionHeading,
} from "./discovery/DiscoveryCards";
export default function ArtistProfileScreen() {
  const params = useLocalSearchParams<{
    id?: string | string[];
  }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const data = useCatalogData();
  const { width } = useWindowDimensions();
  const player = usePlayerActions();
  const [selection, setSelection] = useState({
    artistId: "",
    album: "",
  });
  const artist = data.artists.find((item) => item.id === id && item.active);
  const allSongs = artistSongs(data.songs, id ?? "");
  const albums = artistAlbums(allSongs);
  const selectedAlbum = selection.artistId === id ? selection.album : "";
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
        <BackButton />

        {data.loading ? (
          <Loading />
        ) : (
          <AppText variant="muted">
            Không tìm thấy nghệ sĩ hoặc nghệ sĩ chưa được tải.
          </AppText>
        )}
      </Page>
    );
  }
  return (
    <ListPage
      contentWidth="reading"
      data={songs}
      renderItem={(song) => <SongRow key={song.id} song={song} queue={songs} />}
      keyExtractor={(item) => item.id}
      header={
        <>
          <BackButton />

          <YStack alignItems="center" paddingTop="2">
            <ArtistAvatar
              artist={artist}
              size={Math.min(240, Math.round(width * 0.62))}
            />

            <PageTitle marginTop="4" textAlign="center" alignSelf="stretch">
              {artist.name}
            </PageTitle>

            <AppText
              variant="muted"
              marginTop={5}
              alignSelf="stretch"
              textAlign="center"
            >
              {artist.followerCount ?? 0} followers · {allSongs.length} bài hát
              · {albums.length} album
            </AppText>
          </YStack>

          <XStack
            justifyContent="space-between"
            alignItems="center"
            marginTop="5.5"
            marginBottom="4.5"
          >
            <FollowButton artistId={artist.id} inline />

            <XStack alignItems="center" gap="5">
              <IconButton
                role="button"
                aria-label="Phát ngẫu nhiên"
                disabled={songs.length === 0}
                onPress={() => play(true)}
                padding="2"
                opacity={songs.length ? 1 : 0.35}
              >
                <AppIcon name="shuffle" size={26} color="textMuted" />
              </IconButton>

              <IconButton
                tone="play"
                role="button"
                aria-label="Phát tất cả"
                disabled={songs.length === 0}
                onPress={() => play()}
                width={52}
                height={52}
                borderRadius={26}
                backgroundColor="contrast"
                alignItems="center"
                justifyContent="center"
                opacity={songs.length ? 1 : 0.35}
              >
                <AppIcon name="play" size={25} color="white" />
              </IconButton>
            </XStack>
          </XStack>

          <SectionHeading title={selectedAlbum || "Popular"} />

          {selectedAlbum ? (
            <Action
              onPress={() =>
                setSelection({
                  artistId: artist.id,
                  album: "",
                })
              }
            >
              <TextLink>← Tất cả bài hát của nghệ sĩ</TextLink>
            </Action>
          ) : null}
        </>
      }
      footer={
        <>
          {songs.length === 0 ? (
            <AppText variant="muted">Nghệ sĩ này chưa có bài hát.</AppText>
          ) : null}

          <SectionHeading title="Albums" />

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {albums.map((album) => (
              <Action
                key={album.name}
                role="button"
                aria-label={`Xem album ${album.name}`}
                onPress={() =>
                  setSelection({
                    artistId: artist.id,
                    album: album.name,
                  })
                }
                width={140}
                marginRight="3.5"
              >
                <Artwork uri={album.cover} size={140} />

                <MediaTitle marginTop="2">{album.name}</MediaTitle>

                <MediaSubtitle>{album.songs.length} bài hát</MediaSubtitle>
              </Action>
            ))}
          </ScrollView>

          {albums.length === 0 ? (
            <AppText variant="muted">Chưa có thông tin album.</AppText>
          ) : null}

          <SectionHeading title="About" />

          <AppText variant="muted">
            {artist.biography.trim() ||
              "Nghệ sĩ chưa cập nhật phần giới thiệu."}
          </AppText>
        </>
      }
    />
  );
}
