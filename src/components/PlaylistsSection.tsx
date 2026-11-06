import { router } from "expo-router";
import { ScrollView, YStack } from "tamagui";
import { useUserPlaylists } from "../hooks/useUserPlaylists";

import { AppText, Button, ErrorText } from "./ui/index";

import { PlaylistRow } from "./PlaylistRow";
export function PublicPlaylistsSection({ ownerId }: { ownerId: string }) {
  const state = useUserPlaylists(ownerId);
  return (
    <YStack gap="3">
      <ErrorText message={state.error} />
      {state.items.length ? (
        <>
          <AppText fontWeight="700">Playlist</AppText>
          <ScrollView horizontal>
            {state.items.map((item) => (
              <YStack key={item.id} width={280}>
                <PlaylistRow item={item} />
              </YStack>
            ))}
          </ScrollView>
        </>
      ) : null}
      {state.items.length || state.hasMore || state.error ? (
        <Button
          title="Xem tất cả playlist"
          variant="secondary"
          onPress={() =>
            router.push({ pathname: "/user-playlists", params: { ownerId } })
          }
        />
      ) : null}
    </YStack>
  );
}
