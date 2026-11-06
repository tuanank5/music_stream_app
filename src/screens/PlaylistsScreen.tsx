import { router } from "expo-router";
import { useRef, useState } from "react";
import { createRequestCache } from "../utils/createRequest";
import { newSongId } from "../services/catalogService";
import { Switch } from "react-native";
import { XStack } from "tamagui";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { useAction } from "../hooks/useAction";
import { deletePlaylist, savePlaylist } from "../services/libraryService";
import type { Playlist } from "../types/domain";
import { confirmDelete } from "../utils/feedback";

import Artwork from "../components/Artwork";

import { MediaRow } from "../components/MediaRow";

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
  Loading,
  ModalPanel,
} from "../components/ui/index";
function PlaylistItem({
  playlist,
  onMore,
}: {
  playlist: Playlist;
  onMore?: () => void;
}) {
  const { songs } = useData();
  const { user } = useAuth();
  const cover =
    playlist.songIds
      .map((id) => songs.find((song) => song.id === id)?.cover)
      .find(Boolean) || "";
  return (
    <MediaRow
      title={playlist.name}
      subtitle={`${user?.displayName || "Người dùng"} · Playlist · ${playlist.songIds.length} bài hát`}
      leading={<Artwork uri={cover} size={70} radius={4} />}
      onPress={() =>
        router.push({ pathname: "/playlist", params: { id: playlist.id } })
      }
      trailing={
        onMore ? (
          <IconButton
            onPress={onMore}
            aria-label={`Thao tác với ${playlist.name}`}
          >
            <AppIcon name="more" />
          </IconButton>
        ) : undefined
      }
    />
  );
}
export function PlaylistsScreen() {
  const { user } = useAuth();
  const data = useData();
  const action = useAction();
  const createRequest = useRef(createRequestCache(newSongId));
  const [panel, setPanel] = useState<"form" | "actions" | null>(null);
  const [selected, setSelected] = useState<Playlist | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setPublic] = useState(false);
  function openForm(playlist: Playlist | null) {
    createRequest.current.reset();
    action.setError("");
    setSelected(playlist);
    setName(playlist?.name || "");
    setDescription(playlist?.description || "");
    setPublic(playlist?.isPublic ?? false);
    setPanel("form");
  }
  return (
    <>
      <ListPage
        title="Playlist của bạn"
        titleLeading={<BackButton inline fallback="/library" />}
        titleTrailing={
          <IconButton
            backgroundColor="contrast"
            aria-label="Tạo Playlist"
            onPress={() => openForm(null)}
          >
            <AppIcon name="add" color="white" />
          </IconButton>
        }
        data={data.playlists}
        keyExtractor={(item) => item.id}
        renderItem={(playlist) => (
          <PlaylistItem
            playlist={playlist}
            onMore={() => {
              action.setError("");
              setSelected(playlist);
              setPanel("actions");
            }}
          />
        )}
        footer={
          <>
            <ErrorText message={!panel ? action.error : ""} />
            {data.loading ? (
              <Loading />
            ) : !data.playlists.length ? (
              <EmptyState message="Tạo Playlist đầu tiên để lưu những bài hát bạn muốn nghe cùng nhau." />
            ) : null}
          </>
        }
      />
      {panel && (
        <ModalPanel
          open
          onClose={() => {
            if (!action.busy) setPanel(null);
          }}
          title={
            panel === "form"
              ? selected
                ? "Chỉnh sửa Playlist"
                : "Playlist mới"
              : selected?.name || "Playlist"
          }
          description=""
        >
          <ErrorText message={action.error} />
          {panel === "form" ? (
            <>
              <Field
                label="Tên Playlist"
                value={name}
                onChange={setName}
                autoCapitalize="sentences"
                disabled={action.busy}
              />
              <Field
                label="Mô tả"
                value={description}
                onChange={setDescription}
                multiline
                disabled={action.busy}
              />
              <XStack
                alignItems="center"
                justifyContent="space-between"
                paddingVertical="2"
              >
                <AppText>Công khai</AppText>
                <Switch
                  accessibilityLabel="Công khai Playlist"
                  value={isPublic}
                  disabled={action.busy}
                  onValueChange={setPublic}
                />
              </XStack>
              <Button
                title={selected ? "Lưu thay đổi" : "Tạo Playlist"}
                disabled={action.busy}
                loading={action.busy}
                onPress={() =>
                  void action.run(async () => {
                    if (!user) return;
                    await savePlaylist(
                      user.uid,
                      selected?.id ?? null,
                      name,
                      description,
                      isPublic,
                      createRequest.current.key(user.uid, {
                        name,
                        description,
                        isPublic,
                      }),
                    );
                    setPanel(null);
                  })
                }
              />
            </>
          ) : selected ? (
            <>
              <Button
                title="Chỉnh sửa Playlist"
                variant="secondary"
                disabled={action.busy}
                onPress={() => openForm(selected)}
              />
              <Button
                title={selected.isPublic ? "Riêng tư" : "Công khai"}
                variant="secondary"
                disabled={action.busy}
                onPress={() =>
                  void action.run(async () => {
                    if (!user) return;
                    await savePlaylist(
                      user.uid,
                      selected.id,
                      selected.name,
                      selected.description,
                      !selected.isPublic,
                    );
                    setPanel(null);
                  })
                }
              />
              <Button
                title="Thêm bài hát"
                variant="secondary"
                disabled={action.busy}
                onPress={() => {
                  setPanel(null);
                  router.push("/search");
                }}
              />
              <Button
                title="Xóa Playlist"
                variant="danger"
                disabled={action.busy}
                onPress={() =>
                  confirmDelete(
                    "Thao tác này sẽ xóa vĩnh viễn Playlist này. Bạn có chắc chắn muốn tiếp tục không?",
                    () =>
                      void action.run(async () => {
                        if (!user) return;
                        await deletePlaylist(user.uid, selected.id);
                        setPanel(null);
                      }),
                    "Xóa Playlist?",
                  )
                }
              />
            </>
          ) : null}
        </ModalPanel>
      )}
    </>
  );
}
