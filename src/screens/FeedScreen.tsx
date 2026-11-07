import { router } from "expo-router";
import { useState } from "react";
import { createSubmissionKey } from "../utils/submission";
import { Share, useWindowDimensions } from "react-native";
import { XStack, YStack } from "tamagui";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { usePlayerActions } from "../contexts/PlayerContext";
import { useAction } from "../hooks/useAction";
import { useFeedPage } from "../hooks/useFeedPage";
import LoadMore from "../components/LoadMore";
import * as feed from "../services/feedService";
import type { FeedPost } from "../types/domain";
import { confirmDelete } from "../utils/feedback";
import { normalizeSearch } from "../utils/validation";
import Artwork from "../components/Artwork";
import { MediaCoverCard } from "../components/MediaCoverCard";
import { MediaRow } from "../components/MediaRow";
import {
  Action,
  AppIcon,
  AppText,
  Button,
  EmptyState,
  ErrorText,
  Field,
  IconButton,
  ListPage,
  ModalPanel,
  SearchField,
} from "../components/ui/index";

export default function FeedScreen() {
  const { user } = useAuth();
  const data = useData();
  const player = usePlayerActions();
  const action = useAction();
  const [submission] = useState(() =>
    createSubmissionKey(feed.newSubmissionId),
  );
  const { width } = useWindowDimensions();
  const page = useFeedPage<FeedPost>("/posts");
  const { items: posts, loading, error } = page;
  const [composer, setComposer] = useState(false);
  const [menu, setMenu] = useState<FeedPost | null>(null);
  const [text, setText] = useState("");
  const [songId, setSongId] = useState("");
  const [keyword, setKeyword] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const shown = posts.filter((post) => post.active);
  function openComposer(post?: FeedPost) {
    action.setError("");
    setMenu(null);
    setEditing(post?.id ?? null);
    setText(post?.content || "");
    setSongId(post?.songId || "");
    setKeyword("");
    setComposer(true);
  }
  return (
    <>
      <ListPage
        title="Bảng tin"
        titleTrailing={
          <IconButton
            aria-label="Đăng bài mới"
            backgroundColor="contrast"
            onPress={() => openComposer()}
          >
            <AppIcon name="add" color="white" />
          </IconButton>
        }
        data={shown}
        keyExtractor={(post) => post.id}
        header={
          <>
            <AppText variant="muted" marginBottom="4">
              Âm nhạc và những câu chuyện được chia sẻ.
            </AppText>
            <ErrorText
              message={error || (!composer && !menu ? action.error : "")}
            />
          </>
        }
        renderItem={(post) => {
          const song = data.songs.find(
            (song) => song.id === post.songId && song.active,
          );
          return (
            <YStack
              marginBottom="section"
              gap="3"
              paddingBottom="4"
              borderBottomWidth={1}
              borderColor="surface"
            >
              <XStack alignItems="center" gap="3">
                <YStack
                  width={40}
                  height={40}
                  borderRadius={20}
                  backgroundColor="accentSoft"
                  alignItems="center"
                  justifyContent="center"
                >
                  <AppText color="focusRing" fontWeight="700">
                    {post.authorName.trim().charAt(0).toUpperCase() || "♪"}
                  </AppText>
                </YStack>
                <YStack flex={1} minWidth={0}>
                  <AppText fontWeight="700">{post.authorName}</AppText>
                  <AppText variant="caption">
                    {post.createdAt
                      ? new Date(post.createdAt).toLocaleString()
                      : "Đang gửi..."}
                  </AppText>
                </YStack>
                <IconButton
                  aria-label="Thao tác bài đăng"
                  onPress={() => {
                    action.setError("");
                    setMenu(post);
                  }}
                >
                  <AppIcon name="more" />
                </IconButton>
              </XStack>
              <AppText>{post.content}</AppText>
              {song ? (
                <MediaCoverCard
                  cover={song.cover}
                  width={Math.max(1, width - 40)}
                  title={song.title}
                  subtitle={song.artist}
                  onPress={() => {
                    player.play(song);
                  }}
                />
              ) : post.songId ? (
                <AppText variant="caption">
                  Bài hát đính kèm không còn khả dụng.
                </AppText>
              ) : null}
              <XStack gap="5">
                <Action
                  flexDirection="row"
                  alignItems="center"
                  gap="2"
                  onPress={() =>
                    router.push({
                      pathname: "/comments",
                      params: { id: post.id },
                    })
                  }
                  aria-label="Đọc và viết bình luận"
                >
                  <AppIcon name="comment" size={20} color="textMuted" />
                  <AppText variant="caption">Bình luận</AppText>
                </Action>
                <Action
                  flexDirection="row"
                  alignItems="center"
                  gap="2"
                  onPress={() =>
                    void action.run(() =>
                      Share.share({ message: post.content }),
                    )
                  }
                  aria-label="Chia sẻ bài đăng"
                >
                  <AppIcon name="share-outline" size={20} color="textMuted" />
                  <AppText variant="caption">Chia sẻ</AppText>
                </Action>
              </XStack>
            </YStack>
          );
        }}
        footer={
          <>
            <Button
              title="Làm mới"
              variant="secondary"
              disabled={loading}
              onPress={page.refresh}
            />
            <LoadMore {...page} />
            {!loading && !shown.length ? (
              <EmptyState
                message={
                  error
                    ? "Chưa tải được bảng tin."
                    : "Chưa có bài đăng. Hãy chia sẻ cảm nhận đầu tiên của bạn."
                }
              />
            ) : null}
          </>
        }
      />
      {composer && (
        <ModalPanel
          open
          onClose={() => {
            if (!action.busy) setComposer(false);
          }}
          title={editing ? "Sửa bài đăng" : "Chia sẻ âm nhạc"}
          description="Viết một cảm nhận và đính kèm bài hát nếu muốn."
        >
          <Field
            label="Nội dung"
            value={text}
            onChange={setText}
            multiline
            autoCapitalize="sentences"
          />
          {!editing && (
            <>
              <AppText variant="caption">
                Đính kèm:{" "}
                {data.songs.find((song) => song.id === songId)?.title ||
                  "Không có"}
              </AppText>
              <Button
                title="Không đính kèm bài hát"
                variant="secondary"
                onPress={() => setSongId("")}
              />
              <SearchField
                value={keyword}
                onChange={setKeyword}
                placeholder="Chọn bài hát đính kèm"
              />
              {data.songs
                .filter(
                  (song) =>
                    song.active &&
                    normalizeSearch(`${song.title} ${song.artist}`).includes(
                      normalizeSearch(keyword),
                    ),
                )
                .slice(0, 20)
                .map((song) => (
                  <MediaRow
                    key={song.id}
                    title={song.title}
                    subtitle={song.artist}
                    leading={<Artwork uri={song.cover} size={44} radius={4} />}
                    trailing={
                      songId === song.id ? (
                        <AppIcon name="check" color="focusRing" />
                      ) : undefined
                    }
                    onPress={() => setSongId(song.id)}
                  />
                ))}
              <AppText variant="caption">
                Hiển thị tối đa 20 kết quả. Nhập từ khóa để tìm bài khác.
              </AppText>
            </>
          )}
          <ErrorText message={action.error} />
          <Button
            title={editing ? "Lưu nội dung" : "Đăng bài"}
            loading={action.busy}
            onPress={() =>
              void action.run(async () => {
                if (!user) return;
                if (editing) await feed.updatePost(editing, text);
                else
                  await feed.createPost(
                    user.uid,
                    text,
                    songId,
                    submission.get(user.uid, text.trim(), songId),
                  );
                submission.clear();
                page.refresh();
                setComposer(false);
                setText("");
                setSongId("");
                setEditing(null);
              })
            }
          />
          <Button
            title="Hủy"
            variant="secondary"
            disabled={action.busy}
            onPress={() => setComposer(false)}
          />
        </ModalPanel>
      )}
      {menu && (
        <ModalPanel
          open
          onClose={() => {
            if (!action.busy) setMenu(null);
          }}
          title="Bài đăng"
          description={menu.authorName}
        >
          <ErrorText message={action.error} />
          {menu.ownerId === user?.uid && (
            <Button
              title="Sửa nội dung"
              variant="secondary"
              disabled={action.busy}
              onPress={() => openComposer(menu)}
            />
          )}
          <Button
            title="Bình luận"
            variant="secondary"
            disabled={action.busy}
            onPress={() => {
              const id = menu.id;
              setMenu(null);
              router.push({ pathname: "/comments", params: { id } });
            }}
          />
          <Button
            title="Chia sẻ nội dung"
            variant="secondary"
            disabled={action.busy}
            onPress={() =>
              void action.run(() => Share.share({ message: menu.content }))
            }
          />
          {menu.ownerId === user?.uid && (
            <Button
              title="Ẩn bài đăng"
              variant="danger"
              disabled={action.busy}
              onPress={() =>
                confirmDelete(
                  "Ẩn bài đăng? Bình luận được giữ nhưng không còn hiển thị.",
                  () =>
                    void action.run(async () => {
                      await feed.archivePost(menu.id);
                      page.refresh();
                      setMenu(null);
                    }),
                )
              }
            />
          )}
        </ModalPanel>
      )}
    </>
  );
}
