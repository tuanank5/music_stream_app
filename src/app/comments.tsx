import Guard from "../components/Guard";
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

export default function Route() {
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
    <Guard>
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
    </Guard>
  );
}
