import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { YStack } from "tamagui";
import { useBackendResource } from "../hooks/useBackendResource";
import { useAction } from "../hooks/useAction";
import { changePlaylistSong } from "../services/libraryService";
import { useAuth } from "../contexts/AuthContext";
import type { Playlist, Song } from "../types/domain";
import { AppText, Button, ErrorText, ListPage, Loading } from "./UI";
import Artwork from "./Artwork";
import SongRow from "./SongRow";
import { BackButton } from "./discovery/BackButton";
export default function BackendPlaylistScreen({
  id,
  ownerId,
}: {
  id: string;
  ownerId?: string;
}) {
  const { user } = useAuth(),
    action = useAction();
  const [revision, setRevision] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setRevision((value) => value + 1);
    }, []),
  );
  const state = useBackendResource<{
    playlist: Playlist;
    songs: Song[];
    own: boolean;
  }>("/playlist-info", {
    id,
    ownerId: ownerId || user?.uid || "",
    refresh: String(revision),
  });
  const songs = state.value?.songs || [];
  return (
    <ListPage
      title={state.value?.playlist.name || "Playlist"}
      titleLeading={<BackButton inline fallback="/library" />}
      data={songs}
      keyExtractor={(song) => song.id}
      renderItem={(song) => (
        <SongRow
          song={song}
          queue={songs}
          onChanged={() => setRevision((value) => value + 1)}
          onRemove={
            state.value?.own
              ? () =>
                  void action.run(async () => {
                    if (!user) return;
                    await changePlaylistSong(user.uid, id, song.id, false);
                    setRevision((value) => value + 1);
                  })
              : undefined
          }
        />
      )}
      header={
        <YStack gap="3" alignItems="center">
          <ErrorText message={state.error || action.error} />
          {state.loading ? <Loading /> : null}
          {state.value ? (
            <>
              <Artwork
                uri={songs.find((song) => song.cover)?.cover || ""}
                size={160}
                radius={8}
              />
              <AppText textAlign="center">
                {state.value.playlist.description ||
                  "Bộ sưu tập âm nhạc của bạn"}
              </AppText>
              <AppText>{songs.length} bài hát khả dụng</AppText>
            </>
          ) : null}
        </YStack>
      }
      footer={
        <>
          {state.value?.own ? (
            <Button
              title="Thêm bài hát"
              onPress={() => router.push("/search")}
            />
          ) : null}
          {state.error ? (
            <Button
              title="Thử lại"
              variant="secondary"
              onPress={() => void state.retry()}
            />
          ) : null}
        </>
      }
    />
  );
}
