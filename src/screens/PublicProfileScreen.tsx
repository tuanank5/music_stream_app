import { usePublicProfile } from "../hooks/usePublicProfile";
import { PublicPlaylistsSection } from "../components/PlaylistsSection";
import RelatedArtistsSection from "../components/RelatedArtistsSection";
import Artwork from "../components/Artwork";
import {
  BackButton,
  EmptyState,
  ErrorText,
  Loading,
  Page,
  AppText,
  Button,
} from "../components/ui/index";
import { FollowButton } from "../components/discovery/FollowButton";
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
