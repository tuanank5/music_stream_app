import React, { useEffect, useState } from "react";
import { Share, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { useAction } from "../hooks/useAction";
import { FeedPost, Comment } from "../types/domain";
import * as feed from "../services/feedService";
import { Button, ErrorText, Field, Page, ui } from "../components/UI";
import { confirmDelete, errorMessage } from "../utils/feedback";
import SongRow from "../components/SongRow";
export function FeedScreen() {
  const { user, isAdmin } = useAuth(),
    data = useData(),
    a = useAction();
  const [posts, setPosts] = useState<FeedPost[]>([]),
    [error, setError] = useState(""),
    [text, setText] = useState(""),
    [songId, setSongId] = useState(""),
    [editing, setEditing] = useState<string | null>(null);
  useEffect(
    () => feed.watchPosts(setPosts, (e) => setError(errorMessage(e))),
    [],
  );
  const shown = posts.filter((p) => p.active);
  return (
    <Page title="Feed">
      <Field
        label={editing ? "Sửa nội dung" : "Chia sẻ cảm nhận âm nhạc"}
        value={text}
        onChange={setText}
        multiline
      />
      {!editing && (
        <>
          <Text style={ui.small}>
            Bài hát đính kèm:{" "}
            {data.songs.find((s) => s.id === songId)?.title || "Không có"}
          </Text>
          <View style={ui.row}>
            <Button
              title="Không đính kèm"
              secondary
              onPress={() => setSongId("")}
            />
            {data.songs
              .filter((s) => s.active)
              .slice(0, 6)
              .map((s) => (
                <Button
                  key={s.id}
                  title={s.title}
                  secondary
                  onPress={() => setSongId(s.id)}
                />
              ))}
          </View>
        </>
      )}
      <ErrorText message={a.error || error} />
      <Button
        title={editing ? "Lưu nội dung" : "Đăng bài"}
        disabled={a.busy}
        onPress={() =>
          void a.run(async () => {
            if (!user) return;
            if (editing) await feed.updatePost(editing, text);
            else
              await feed.createPost(
                user.uid,
                user.displayName ?? "",
                text,
                songId,
              );
            setText("");
            setSongId("");
            setEditing(null);
          })
        }
      />
      {editing && (
        <Button
          title="Hủy sửa"
          secondary
          onPress={() => {
            setEditing(null);
            setText("");
          }}
        />
      )}
      {shown.map((p) => (
        <View key={p.id} style={ui.card}>
          <Text style={{ fontWeight: "700" }}>{p.authorName}</Text>
          <Text style={ui.small}>
            {p.createdAt
              ? new Date(p.createdAt).toLocaleString()
              : "Đang gửi..."}
          </Text>
          <Text style={[ui.muted, { marginVertical: 12 }]}>{p.content}</Text>
          {(() => {
            const s = data.songs.find((s) => s.id === p.songId && s.active);
            return s ? <SongRow song={s} /> : null;
          })()}
          <Button
            title="Bình luận"
            secondary
            onPress={() =>
              router.push({ pathname: "/comments", params: { id: p.id } })
            }
          />
          <Button
            title="Chia sẻ nội dung"
            secondary
            onPress={() =>
              void a.run(() => Share.share({ message: p.content }))
            }
          />
          {(p.ownerId === user?.uid || isAdmin) && (
            <View style={ui.row}>
              {p.ownerId === user?.uid && (
                <Button
                  title="Sửa"
                  secondary
                  onPress={() => {
                    setEditing(p.id);
                    setText(p.content);
                  }}
                />
              )}
              <Button
                title="Xóa bài đăng (ẩn)"
                secondary
                disabled={a.busy}
                onPress={() =>
                  confirmDelete(
                    "Ẩn bài đăng? Bình luận được giữ nhưng không còn hiển thị.",
                    () => void a.run(() => feed.archivePost(p.id)),
                  )
                }
              />
            </View>
          )}
        </View>
      ))}
      {!shown.length && <Text style={ui.muted}>Chưa có bài đăng.</Text>}
    </Page>
  );
}
export function CommentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { user, isAdmin } = useAuth(),
    a = useAction();
  const [comments, setComments] = useState<Comment[]>([]),
    [error, setError] = useState(""),
    [text, setText] = useState(""),
    [editing, setEditing] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    return feed.watchComments(id, setComments, (e) =>
      setError(errorMessage(e)),
    );
  }, [id]);
  return (
    <Page title="Comments">
      <ErrorText message={error} />
      <Field
        label={editing ? "Sửa bình luận" : "Viết bình luận"}
        value={text}
        onChange={setText}
        multiline
      />
      <ErrorText message={a.error} />
      <Button
        title={editing ? "Lưu" : "Gửi bình luận"}
        disabled={a.busy || !!error}
        onPress={() =>
          void a.run(async () => {
            if (!user || !id) return;
            if (editing) await feed.updateComment(id, editing, text);
            else
              await feed.createComment(
                id,
                user.uid,
                user.displayName ?? "",
                text,
              );
            setText("");
            setEditing(null);
          })
        }
      />
      {editing && (
        <Button
          title="Hủy sửa"
          secondary
          onPress={() => {
            setEditing(null);
            setText("");
          }}
        />
      )}
      {comments.map((c) => (
        <View key={c.id} style={ui.card}>
          <Text style={{ fontWeight: "700" }}>{c.authorName}</Text>
          <Text style={ui.muted}>{c.content}</Text>
          <Text style={ui.small}>
            {c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}
          </Text>
          {(c.ownerId === user?.uid || isAdmin) && (
            <View style={ui.row}>
              {c.ownerId === user?.uid && (
                <Button
                  title="Sửa"
                  secondary
                  onPress={() => {
                    setEditing(c.id);
                    setText(c.content);
                  }}
                />
              )}
              <Button
                title="Xóa"
                secondary
                disabled={a.busy}
                onPress={() =>
                  confirmDelete(
                    "Xóa bình luận?",
                    () => void a.run(() => feed.deleteComment(id, c.id)),
                  )
                }
              />
            </View>
          )}
        </View>
      ))}
    </Page>
  );
}
