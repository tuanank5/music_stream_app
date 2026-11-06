import { router, useLocalSearchParams } from "expo-router";
import { MediaRow } from "../components/MediaRow";
import Artwork from "../components/Artwork";
import AlbumFavoriteButton from "../components/AlbumFavoriteButton";
import { PublicPlaylistsSection } from "../components/PlaylistsSection";
import RelatedArtistsSection from "../components/RelatedArtistsSection";
import { useCatalogData } from "../contexts/DataContext";
import { XStack, YStack } from "tamagui";
import { usePublicProfile } from "../hooks/usePublicProfile";
import { useCursorList } from "../hooks/useCursorList";
import { usePlayerActions } from "../contexts/PlayerContext";
import { ArtistAvatar } from "../components/discovery/ArtistAvatar";
import { FollowButton } from "../components/discovery/FollowButton";
import { BackButton } from "../components/ui/BackButton";
import {
  AppText,
  Button,
  EmptyState,
  ErrorText,
  ListPage,
  Loading,
  PageTitle,
} from "../components/ui/index";
import SongRow from "../components/SongRow";
import LoadMore from "../components/LoadMore";
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
      title="Hồ sơ người dùng"
      titleLeading={<BackButton inline />}
      data={songs}
      keyExtractor={(song) => song.id}
      renderItem={(song) => <SongRow song={song} queue={songs} />}
      onEndReached={() => {
        if (state.started && !state.error) void state.loadMore();
      }}
      header={
        <>
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
              <XStack gap="3" marginVertical="4" alignItems="center">
                <YStack flex={1} alignItems="center">
                  <FollowButton artistId={id} inline />
                </YStack>
                <YStack flex={1}>
                  <Button
                    title="Phát bài hát"
                    disabled={!songs.length}
                    onPress={() => {
                      if (songs.length) player.play(songs[0], songs);
                    }}
                  />
                </YStack>
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
        <YStack gap="4" marginTop="4">
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
                    <Artwork uri={album.coverUrl} size={70} radius={4} />
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
        </YStack>
      }
    />
  );
}
