import { usePublicProfile } from "../hooks/usePublicProfile";
import { PublicPlaylistsSection } from "./UserPlaylists";
import RelatedArtistsSection from "./RelatedArtistsSection";
import Artwork from "./Artwork";
import {
  BackButton,
  EmptyState,
  ErrorText,
  Loading,
  Page,
  AppText,
  Button,
} from "./UI";
import { FollowButton } from "./discovery/DiscoveryCards";
export default function PublicProfileScreen({ id }: { id: string }) {
  const state = usePublicProfile(id);
  return (
    <Page
      title={state.profile?.name || "Người dùng"}
      titleLeading={<BackButton inline />}
    >
      <ErrorText message={state.error} />
      <Button
        title="Làm mới hồ sơ"
        variant="secondary"
        disabled={state.loading}
        onPress={state.refresh}
      />
      {state.loading ? (
        <Loading />
      ) : state.profile ? (
        <>
          <Artwork uri={state.profile.imageUrl} size={140} radius={70} />
          <AppText variant="muted">
            Người dùng · {state.profile.followerCount} người theo dõi
          </AppText>
          <AppText>{state.profile.biography || "Chưa có giới thiệu."}</AppText>
          <FollowButton artistId={id} />
          <PublicPlaylistsSection ownerId={id} />
          <RelatedArtistsSection id={id} />
        </>
      ) : (
        <EmptyState message="Hồ sơ không còn khả dụng." />
      )}
    </Page>
  );
}
