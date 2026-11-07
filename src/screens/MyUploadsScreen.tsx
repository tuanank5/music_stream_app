import { useEffect, useRef, useState } from "react";
import { useAction } from "../hooks/useAction";
import { loadUploadsQueue } from "../services/uploadsService";
import { router } from "expo-router";
import { useCursorList } from "../hooks/useCursorList";
import LoadMore from "../components/LoadMore";
import { XStack, YStack } from "tamagui";
import { usePlayerActions, usePlayerState } from "../contexts/PlayerContext";
import { useBackendResource } from "../hooks/useBackendResource";

import SongRow from "../components/SongRow";
import MyAlbumsScreen from "./MyAlbumsScreen";
import {
  AppText,
  Button,
  EmptyState,
  ErrorText,
  ListPage,
  Loading,
  SurfaceCard,
  SearchField,
  IconButton,
  AppIcon,
} from "../components/ui/index";
import { BackButton } from "../components/ui/BackButton";
export default function MyUploadsScreen() {
  const [keyword, setKeyword] = useState("");
  const [tab, setTab] = useState<"songs" | "albums">("songs");
  const [revision, setRevision] = useState(0);
  const player = usePlayerActions();
  const action = useAction();
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  const playback = usePlayerState();
  const uploads = useCursorList(
    "/uploads",
    { q: keyword, refresh: String(revision) },
    tab === "songs",
    300,
  );
  const quota = useBackendResource<{ percentUsed: number }>("/uploads-info", {
    refresh: String(revision),
  });
  const songs = uploads.items.flatMap((result) =>
    result.kind === "song" ? [result.item] : [],
  );
  if (tab === "albums")
    return <MyAlbumsScreen onSongs={() => setTab("songs")} />;
  return (
    <ListPage
      title="Bài hát đã đăng tải"
      titleLeading={<BackButton inline fallback="/library" />}
      data={songs}
      onEndReached={() => {
        if (uploads.started && !uploads.error) void uploads.loadMore();
      }}
      renderItem={(song) => (
        <SongRow
          song={song}
          queue={songs}
          onChanged={() => setRevision((value) => value + 1)}
        />
      )}
      keyExtractor={(item) => item.id}
      header={
        <>
          <XStack gap="3">
            <Button title="Bài hát" disabled onPress={() => {}} />
            <Button
              title="Album"
              variant="secondary"
              onPress={() => setTab("albums")}
            />
          </XStack>
          <SurfaceCard>
            {quota.loading ? (
              <Loading />
            ) : quota.value ? (
              <>
                <AppText>
                  {Math.round(quota.value.percentUsed)}% số lượt tải lên của bạn
                  đã được sử dụng
                </AppText>
                <YStack
                  role="progressbar"
                  aria-label="Hạn mức tải lên"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.min(100, quota.value.percentUsed)}
                  height={8}
                  borderRadius={4}
                  backgroundColor="artworkBackground"
                  borderWidth={1}
                  borderColor="borderColor"
                  overflow="hidden"
                >
                  <YStack
                    height={8}
                    backgroundColor="primary"
                    width={`${Math.min(100, Math.max(0, quota.value.percentUsed))}%`}
                  />
                </YStack>
              </>
            ) : null}
            <ErrorText message={quota.error} />
            {quota.error ? (
              <Button
                title="Thử lại"
                variant="secondary"
                onPress={() => void quota.retry()}
              />
            ) : null}
            <Button
              title="Tận hưởng khả năng tải lên không giới hạn"
              variant="secondary"
              onPress={() => router.push("/premium")}
            />
          </SurfaceCard>
          <XStack
            justifyContent="space-between"
            alignItems="center"
            marginVertical="4"
          >
            <IconButton
              aria-label="Tải lên một bài hát"
              onPress={() => router.push("/upload")}
            >
              <AppIcon name="upload" />
            </IconButton>
            <XStack gap="3" alignItems="center">
              <IconButton
                aria-label={
                  playback.repeatAll
                    ? "Tắt lặp lại danh sách"
                    : "Phát lặp lại danh sách"
                }
                aria-pressed={playback.repeatAll}
                disabled={action.busy || !songs.length}
                onPress={() => {
                  if (playback.repeatAll) {
                    player.setRepeatAll(false);
                    return;
                  }
                  void action.run(async () => {
                    const queue = await loadUploadsQueue(() => live.current);
                    if (!live.current || !queue.length) return;
                    player.setRepeat(false);
                    player.setRepeatAll(true);
                    player.play(queue[0], queue);
                  });
                }}
              >
                <AppIcon
                  name="infinity"
                  color={playback.repeatAll ? "primary" : "textMuted"}
                />
              </IconButton>
              <IconButton
                aria-label="Phát bài hát đã đăng tải"
                disabled={action.busy || !songs.length}
                onPress={() => {
                  void action.run(async () => {
                    const queue = await loadUploadsQueue(() => live.current);
                    if (!live.current) return;
                    player.setRepeat(false);
                    if (queue[0]) player.play(queue[0], queue);
                  });
                }}
              >
                <AppIcon name="play" />
              </IconButton>
            </XStack>
          </XStack>
          {action.busy ? <Loading /> : null}
          <ErrorText message={action.error} />
          <ErrorText message={uploads.error} />
          {songs.length || keyword ? (
            <SearchField
              value={keyword}
              onChange={setKeyword}
              placeholder="Tìm kiếm bài hát đã đăng tải"
            />
          ) : null}
        </>
      }
      footer={
        <>
          {!uploads.loading &&
          !songs.length &&
          !uploads.error &&
          !uploads.hasMore &&
          !keyword ? (
            <YStack alignItems="center" gap="4" padding="5">
              <AppText textAlign="center" fontWeight="700">
                Chỉ cần tải lên một file.
              </AppText>
              <AppText textAlign="center">
                Tham gia cùng hàng triệu nghệ sĩ sử dụng MusicSteamApp để được
                mọi người biết đến.
              </AppText>
              <Button
                title="Tải lên một bài hát"
                onPress={() => router.push("/upload")}
              />
            </YStack>
          ) : !uploads.loading &&
            !songs.length &&
            !uploads.error &&
            !uploads.hasMore &&
            keyword ? (
            <EmptyState message="Không có bài hát đã đăng tải phù hợp." />
          ) : null}
          <LoadMore {...uploads} />
        </>
      }
    />
  );
}
