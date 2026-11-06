import { router, useLocalSearchParams } from "expo-router";
import { MediaRow } from "./MediaRow";
import Artwork from "./Artwork";
import AlbumFavoriteButton from "./AlbumFavoriteButton";
import { PublicPlaylistsSection } from "./UserPlaylists";
import RelatedArtistsSection from "./RelatedArtistsSection";
import { useCatalogData } from "../contexts/DataContext";
import { XStack, YStack } from "tamagui";
import { usePublicProfile } from "../hooks/usePublicProfile";
import { useCursorList } from "../hooks/useCursorList";
import { usePlayerActions } from "../contexts/PlayerContext";
import {
  ArtistAvatar,
  FollowButton,
  BackButton,
} from "./discovery/DiscoveryCards";
import {
  AppText,
  Button,
  EmptyState,
  ErrorText,
  ListPage,
  Loading,
  PageTitle,
} from "./UI";
import SongRow from "./SongRow";
import LoadMore from "./LoadMore";
export default function ArtistProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = usePublicProfile(id || "");
  const state = useCursorList("/collection", { artistId: id || "" }, !!id);
  const player = usePlayerActions();
  const songs = state.items.flatMap((result) =>
    result.kind === "song" ? [result.item] : [],
  );
  const catalog = useCatalogData();
  const albums = catalog.albums.filter(
    (album) => album.artistId === id && album.isPublic,
  );
  return (
    <ListPage
      data={songs}
      keyExtractor={(song) => song.id}
      renderItem={(song) => <SongRow song={song} queue={songs} />}
      onEndReached={() => {
        if (state.started && !state.error) void state.loadMore();
      }}
      header={
        <>
          <BackButton />
          <ErrorText message={profile.error} />
          <Button
            title="Làm mới hồ sơ"
            variant="secondary"
            disabled={profile.loading}
            onPress={profile.refresh}
          />
          {profile.loading ? (
            <Loading />
          ) : profile.profile ? (
            <>
              <YStack alignItems="center" gap="3">
                <ArtistAvatar artist={profile.profile} size={180} />
                <PageTitle>{profile.profile.name}</PageTitle>
                <AppText variant="muted">
                  {profile.profile.followerCount ?? 0} người theo dõi
                </AppText>
              </YStack>
              <XStack gap="3" marginVertical="4">
                <FollowButton artistId={id} />
                <Button
                  title="Phát bài hát"
                  disabled={!songs.length}
                  onPress={() => {
                    player.play(songs[0], songs);
                  }}
                />
              </XStack>
              <AppText variant="muted">
                {profile.profile.biography || "Chưa có giới thiệu."}
              </AppText>
              <AppText fontWeight="700" marginVertical="3">
                Bài hát
              </AppText>
            </>
          ) : (
            <EmptyState message="Hồ sơ không còn khả dụng." />
          )}
        </>
      }
      footer={
        <>
          <LoadMore {...state} />
          <PublicPlaylistsSection ownerId={id || ""} />
          {id ? <RelatedArtistsSection id={id} /> : null}
          {!state.loading && state.started && !songs.length && (
            <EmptyState message="Chưa có bài hát công khai." />
          )}
          {!!albums.length && (
            <>
              <AppText fontWeight="700">Album</AppText>
              {albums.map((album) => (
                <MediaRow
                  key={album.id}
                  title={album.title || "Album"}
                  subtitle={album.artistName}
                  leading={
                    <Artwork uri={album.coverUrl} size={60} radius={4} />
                  }
                  trailing={<AlbumFavoriteButton id={album.id} />}
                  onPress={() =>
                    router.push({
                      pathname: "/album",
                      params: { id: album.id },
                    })
                  }
                />
              ))}
            </>
          )}
        </>
      }
    />
  );
}
