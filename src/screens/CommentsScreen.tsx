import { useState } from "react";
import { createSubmissionKey } from "../utils/submission";
import { FlatList, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { XStack, YStack, styled } from "tamagui";
import { useAuth } from "../contexts/AuthContext";
import { useAction } from "../hooks/useAction";
import { useBackNavigation } from "../hooks/useBackNavigation";
import { useFeedPage } from "../hooks/useFeedPage";
import LoadMore from "../components/LoadMore";
import * as feed from "../services/feedService";
import type { Comment } from "../types/domain";
import { confirmDelete } from "../utils/feedback";
import {
  Action,
  AppIcon,
  AppText,
  Button,
  EmptyState,
  ErrorText,
  Field,
  IconButton,
  Loading,
  ModalPanel,
} from "../components/ui/index";

const KeyboardFrame = styled(KeyboardAvoidingView, { flex: 1 });
export default function CommentsScreen({ postId }: { postId: string }) {
  const closeComments = useBackNavigation("/feed");
  const { user } = useAuth();
  const action = useAction();
  const [submission] = useState(() =>
    createSubmissionKey(feed.newSubmissionId),
  );
  const insets = useSafeAreaInsets();
  const page = useFeedPage<Comment>(
    `/posts/${encodeURIComponent(postId)}/comments`,
  );
  const { items: comments, loading, error } = page;
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [selected, setSelected] = useState<Comment | null>(null);
  return (
    <KeyboardFrame behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <YStack flex={1} backgroundColor="overlay" justifyContent="flex-end">
        <Action flex={1} aria-label="Đóng bình luận" onPress={closeComments} />
        <YStack
          height="85%"
          backgroundColor="background"
          borderTopLeftRadius={24}
          borderTopRightRadius={24}
          paddingBottom={Math.max(12, insets.bottom)}
        >
          <YStack
            alignSelf="center"
            width={36}
            height={4}
            borderRadius={2}
            backgroundColor="borderColor"
            marginTop="3"
          />
          <XStack
            paddingHorizontal="gutter"
            paddingVertical="3"
            alignItems="center"
            justifyContent="space-between"
          >
            <AppText fontSize="heading" lineHeight="heading" fontWeight="700">
              {comments.length} bình luận
            </AppText>
            <IconButton aria-label="Đóng bình luận" onPress={closeComments}>
              <AppIcon name="collapse" />
            </IconButton>
          </XStack>
          <ErrorText message={error} />
          <FlatList
            data={comments}
            ListFooterComponent={
              <>
                <Button
                  title="Làm mới"
                  variant="secondary"
                  onPress={page.refresh}
                />
                <LoadMore {...page} />
              </>
            }
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20 }}
            keyExtractor={(comment) => comment.id}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            initialNumToRender={12}
            renderItem={({ item: comment }) => (
              <XStack gap="3" paddingVertical="3" alignItems="flex-start">
                <YStack
                  width={36}
                  height={36}
                  borderRadius={18}
                  backgroundColor="accentSoft"
                  alignItems="center"
                  justifyContent="center"
                >
                  <AppText color="focusRing" fontWeight="700">
                    {comment.authorName.trim().charAt(0).toUpperCase() || "?"}
                  </AppText>
                </YStack>
                <YStack flex={1} minWidth={0} gap="1">
                  <AppText fontWeight="700">{comment.authorName}</AppText>
                  <AppText>{comment.content}</AppText>
                  <AppText variant="caption">
                    {comment.createdAt
                      ? new Date(comment.createdAt).toLocaleString()
                      : "Đang gửi..."}
                  </AppText>
                </YStack>
                {comment.ownerId === user?.uid && (
                  <IconButton
                    aria-label="Sửa hoặc xóa bình luận"
                    onPress={() => {
                      action.setError("");
                      setSelected(comment);
                    }}
                  >
                    <AppIcon name="more" size={20} />
                  </IconButton>
                )}
              </XStack>
            )}
            ListEmptyComponent={
              loading ? (
                <Loading />
              ) : (
                <EmptyState
                  message={
                    error
                      ? "Chưa tải được bình luận."
                      : "Chưa có bình luận. Hãy bắt đầu cuộc trò chuyện."
                  }
                />
              )
            }
          />
          <YStack
            paddingHorizontal="gutter"
            paddingTop="3"
            borderTopWidth={1}
            borderColor="surface"
          >
            <ErrorText message={!selected ? action.error : ""} />
            <Field
              label={editing ? "Sửa bình luận" : "Viết bình luận"}
              value={text}
              onChange={setText}
              multiline
              autoCapitalize="sentences"
            />
            <XStack gap="3" alignItems="center">
              <YStack flex={1}>
                <Button
                  title={editing ? "Lưu thay đổi" : "Gửi bình luận"}
                  loading={action.busy}
                  disabled={!!error || !text.trim()}
                  onPress={() =>
                    void action.run(async () => {
                      if (!user) return;
                      if (editing)
                        await feed.updateComment(postId, editing, text);
                      else
                        await feed.createComment(
                          postId,
                          user.uid,
                          text,
                          submission.get(user.uid, postId, text.trim()),
                        );
                      submission.clear();
                      page.refresh();
                      setText("");
                      setEditing(null);
                    })
                  }
                />
              </YStack>
              {editing && (
                <Button
                  title="Hủy sửa"
                  variant="secondary"
                  onPress={() => {
                    setEditing(null);
                    setText("");
                  }}
                />
              )}
            </XStack>
          </YStack>
        </YStack>
      </YStack>
      {selected && (
        <ModalPanel
          open
          onClose={() => {
            if (!action.busy) setSelected(null);
          }}
          title="Bình luận"
          description={selected.content}
        >
          <ErrorText message={action.error} />
          {selected.ownerId === user?.uid && (
            <Button
              title="Sửa bình luận"
              variant="secondary"
              onPress={() => {
                setEditing(selected.id);
                setText(selected.content);
                setSelected(null);
              }}
            />
          )}
          <Button
            title="Xóa bình luận"
            variant="danger"
            disabled={action.busy}
            onPress={() =>
              confirmDelete(
                "Xóa bình luận?",
                () =>
                  void action.run(async () => {
                    await feed.deleteComment(postId, selected.id);
                    page.refresh();
                    setSelected(null);
                    if (editing === selected.id) {
                      setEditing(null);
                      setText("");
                    }
                  }),
              )
            }
          />
        </ModalPanel>
      )}
    </KeyboardFrame>
  );
}
