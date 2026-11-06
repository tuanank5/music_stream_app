import { useCallback, useRef, useState } from "react";
import { createRequestCache } from "../utils/createRequest";
import { newSongId } from "../services/catalogService";
import * as ImagePicker from "expo-image-picker";
import { getFirebaseAuth } from "../services/firebase";
import { uploadMedia } from "../services/mediaUploadService";
import { Switch } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { XStack } from "tamagui";
import { useCursorList } from "../hooks/useCursorList";
import { useAction } from "../hooks/useAction";
import {
  backendDelete,
  backendPatch,
  backendPost,
} from "../services/backendService";
import type { Album } from "../types/domain";
import Artwork from "../components/Artwork";
import { MediaRow } from "../components/MediaRow";
import LoadMore from "../components/LoadMore";
import { BackButton } from "../components/ui/BackButton";
import {
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

export default function MyAlbumsScreen({ onSongs }: { onSongs: () => void }) {
  const [query, setQuery] = useState(""),
    [revision, setRevision] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setRevision((value) => value + 1);
    }, []),
  );
  const state = useCursorList(
    "/my-albums",
    { q: query, refresh: String(revision) },
    true,
    300,
  );
  const action = useAction();
  const createRequest = useRef(createRequestCache(newSongId));
  const [panel, setPanel] = useState<"actions" | "form" | "delete" | null>(
    null,
  );
  const [selected, setSelected] = useState<Album | null>(null);
  const [title, setTitle] = useState(""),
    [description, setDescription] = useState("");
  const [isPublic, setPublic] = useState(false);
  const [coverUrl, setCoverUrl] = useState("");
  const albums = state.items.flatMap((row) =>
    row.kind === "album" ? [row.item] : [],
  );
  const edit = (album: Album | null) => {
    createRequest.current.reset();
    action.setError("");
    setSelected(album);
    setTitle(album?.title || "");
    setDescription(album?.description || "");
    setCoverUrl(album?.coverUrl || "");
    setPublic(album?.isPublic ?? false);
    setPanel("form");
  };
  return (
    <>
      <ListPage
        title="Bài hát đã đăng tải"
        titleLeading={<BackButton inline fallback="/library" />}
        data={albums}
        keyExtractor={(album) => album.id}
        onEndReached={() => {
          if (state.started && !state.error) void state.loadMore();
        }}
        header={
          <>
            <XStack gap="3">
              <Button title="Bài hát" variant="secondary" onPress={onSongs} />
              <Button title="Album" disabled onPress={() => {}} />
            </XStack>
            <Button
              title="Tạo Album"
              variant="secondary"
              onPress={() => edit(null)}
            />
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Tìm Album của bạn"
            />
            <ErrorText message={!panel ? action.error : ""} />
          </>
        }
        renderItem={(album) => (
          <MediaRow
            title={album.title}
            subtitle={`${album.artistName} · ${album.songCount ?? 0} bài hát`}
            leading={<Artwork uri={album.coverUrl} size={70} radius={4} />}
            onPress={() =>
              router.push({
                pathname: "/album",
                params: { id: album.id, owned: "1" },
              })
            }
            trailing={
              <IconButton
                aria-label={`Thao tác với ${album.title}`}
                onPress={() => {
                  action.setError("");
                  setSelected(album);
                  setPanel("actions");
                }}
              >
                <AppIcon name="more" />
              </IconButton>
            }
          />
        )}
        footer={
          <>
            <LoadMore {...state} />
            {!state.loading &&
            !state.error &&
            !state.hasMore &&
            !albums.length ? (
              <EmptyState message="Chưa có Album phù hợp." />
            ) : null}
            <Button
              title="Làm mới Album"
              variant="secondary"
              onPress={() => setRevision((value) => value + 1)}
            />
          </>
        }
      />
      {panel ? (
        <ModalPanel
          open
          title={
            panel === "delete"
              ? "Xóa album?"
              : panel === "form"
                ? selected
                  ? "Chỉnh sửa album"
                  : "Tạo album"
                : selected?.title || "Album"
          }
          description={
            panel === "delete"
              ? "Thao tác này sẽ xóa vĩnh viễn album này. Các bài hát vẫn được giữ lại. Bạn có chắc chắn muốn tiếp tục không?"
              : ""
          }
          onClose={() => {
            if (!action.busy) setPanel(null);
          }}
        >
          <ErrorText message={action.error} />
          {panel === "delete" && selected ? (
            <Button
              title="Xóa Album"
              variant="danger"
              loading={action.busy}
              onPress={() =>
                void action.run(async () => {
                  await backendDelete(
                    `/albums/${encodeURIComponent(selected.id)}`,
                  );
                  setPanel(null);
                  setRevision((value) => value + 1);
                })
              }
            />
          ) : panel === "form" ? (
            <>
              <Artwork uri={coverUrl} size={120} radius={8} />
              <Button
                title="Chọn ảnh bìa"
                variant="secondary"
                disabled={action.busy}
                onPress={() =>
                  void action.run(async () => {
                    const user = getFirebaseAuth().currentUser;
                    const result = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ["images"],
                      allowsEditing: true,
                      aspect: [1, 1],
                      quality: 0.85,
                    });
                    if (result.canceled) return;
                    if (!user || getFirebaseAuth().currentUser !== user)
                      throw new Error("Phiên đăng nhập đã thay đổi.");
                    const asset = result.assets[0];
                    const uploaded = await uploadMedia(
                      {
                        uri: asset.uri,
                        name: asset.fileName || "album.jpg",
                        mimeType: asset.mimeType || "image/jpeg",
                        size: asset.fileSize,
                        file: asset.file,
                      },
                      "image",
                    );
                    if (getFirebaseAuth().currentUser !== user)
                      throw new Error("Phiên đăng nhập đã thay đổi.");
                    setCoverUrl(uploaded.url);
                  })
                }
              />
              <Field
                label="Tên Album"
                value={title}
                onChange={setTitle}
                disabled={action.busy}
              />
              <Field
                label="Mô tả"
                value={description}
                onChange={setDescription}
                multiline
                disabled={action.busy}
              />
              <XStack alignItems="center" justifyContent="space-between">
                <AppText>Công khai</AppText>
                <Switch
                  accessibilityLabel="Công khai album"
                  value={isPublic}
                  disabled={action.busy}
                  onValueChange={setPublic}
                />
              </XStack>
              <Button
                title="Lưu Album"
                loading={action.busy}
                onPress={() =>
                  void action.run(async () => {
                    const fields = {
                      title,
                      description,
                      coverUrl,
                      isPublic,
                    };
                    if (selected)
                      await backendPatch(
                        `/albums/${encodeURIComponent(selected.id)}`,
                        fields,
                      );
                    else {
                      const uid = getFirebaseAuth().currentUser?.uid;
                      if (!uid) throw new Error("Cần đăng nhập.");
                      await backendPost(
                        "/albums",
                        fields,
                        createRequest.current.key(uid, fields),
                      );
                    }
                    setPanel(null);
                    setRevision((value) => value + 1);
                  })
                }
              />
            </>
          ) : selected ? (
            <>
              <Button
                title="Chỉnh sửa Album"
                variant="secondary"
                disabled={action.busy}
                onPress={() => edit(selected)}
              />
              <Button
                title={selected.isPublic ? "Riêng tư" : "Công khai"}
                variant="secondary"
                disabled={action.busy}
                onPress={() =>
                  void action.run(async () => {
                    await backendPatch(
                      `/albums/${encodeURIComponent(selected.id)}`,
                      {
                        title: selected.title,
                        description: selected.description || "",
                        coverUrl: selected.coverUrl,
                        isPublic: !selected.isPublic,
                      },
                    );
                    setPanel(null);
                    setRevision((value) => value + 1);
                  })
                }
              />
              <Button
                title="Thêm bài hát"
                variant="secondary"
                disabled={action.busy}
                onPress={() => {
                  const id = selected.id;
                  setPanel(null);
                  router.push({ pathname: "/album-add", params: { id } });
                }}
              />
              <Button
                title="Xóa Album"
                variant="danger"
                disabled={action.busy}
                onPress={() => setPanel("delete")}
              />
            </>
          ) : null}
        </ModalPanel>
      ) : null}
    </>
  );
}
