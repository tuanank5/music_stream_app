import { router } from "expo-router";
import { ScrollView, YStack } from "tamagui";
import { useBackendResource } from "../hooks/useBackendResource";
import type { Artist } from "../types/domain";
import { Action, AppText, ErrorText } from "./UI";
import { ArtistAvatar, FollowButton } from "./discovery/DiscoveryCards";
export default function RelatedArtistsSection({ id }: { id: string }) {
  const state = useBackendResource<{ title: string; artists: Artist[] }>(
    "/related-artists",
    { id },
  );
  return (
    <YStack gap="3" marginVertical="4">
      <ErrorText message={state.error} />
      {state.value?.artists.length ? (
        <>
          <AppText fontWeight="700">{state.value.title}</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {state.value.artists.map((artist) => (
              <YStack
                key={artist.id}
                width={136}
                alignItems="center"
                gap="2"
                marginRight="3"
              >
                <Action
                  alignItems="center"
                  gap="2"
                  onPress={() =>
                    router.push({
                      pathname: "/artist",
                      params: { id: artist.id },
                    })
                  }
                  aria-label={`Xem nghệ sĩ ${artist.name}`}
                >
                  <ArtistAvatar artist={artist} size={90} />
                  <AppText numberOfLines={2} textAlign="center">
                    {artist.name}
                  </AppText>
                </Action>
                <FollowButton artistId={artist.id} />
              </YStack>
            ))}
          </ScrollView>
        </>
      ) : null}
    </YStack>
  );
}
