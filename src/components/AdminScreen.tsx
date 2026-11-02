import { useState } from "react";
import { XStack } from "tamagui";

import { BackButton } from "./discovery/BackButton";
import {
  AppText,
  Button,
  ErrorText,
  Field,
  Page,
  SectionTitle,
  SurfaceCard,
  Toggle,
  FilterBar,
} from "./UI";
import { useData } from "../contexts/DataContext";
import { useAction } from "../hooks/useAction";
import {
  archiveArtist,
  archiveSong,
  deleteSongPermanently,
  saveArtist,
  saveSong,
} from "../services/catalogService";
import { SongInput } from "../types/domain";
import { confirmDelete, notify } from "../utils/feedback";
const empty: SongInput = {
  title: "",
  artist: "",
  artistId: "",
  album: "",
  coverUrl: "",
  audioUrl: "",
  audioKey: "",
  durationSeconds: 0,
  lyrics: "",
  active: true,
};
const adminTabs = [
  { value: "songs", label: "Bài hát" },
  { value: "artists", label: "Nghệ sĩ" },
] as const;
export default function AdminScreen() {
  const data = useData(),
    a = useAction();
  const [tab, setTab] = useState<"songs" | "artists">("songs"),
    [song, setSong] = useState<SongInput>(empty),
    [songId, setSongId] = useState<string | null>(null),
    [artistId, setArtistId] = useState<string | null>(null),
    [artist, setArtist] = useState({
      name: "",
      imageUrl: "",
      biography: "",
      active: true,
    });
  return (
    <Page
      title="Quản trị"
      titleLeading={<BackButton inline fallback="/profile" disabled={a.busy} />}
      keyboardAvoiding
    >
      <FilterBar
        options={adminTabs}
        value={tab}
        onChange={(value) => {
          if (!a.busy) setTab(value);
        }}
      />
      <ErrorText message={a.error} />
      {tab === "songs" ? (
        <>
          <SectionTitle>{songId ? "Sửa bài hát" : "Thêm bài hát"}</SectionTitle>
          {(
            [
              ["title", "Tên bài hát"],
              ["artist", "Tên nghệ sĩ (dự phòng)"],
              ["artistId", "artistId (chọn bên dưới hoặc để trống)"],
              ["album", "Album"],
              ["coverUrl", "URL ảnh bìa HTTPS"],
              ["audioUrl", "URL âm thanh HTTPS"],
              ["audioKey", "Hoặc audioKey: demo1 / demo2 / demo3"],
              ["lyrics", "Lời bài hát (tự viết hoặc có quyền dùng)"],
            ] as const
          ).map(([key, label]) => (
            <Field
              key={key}
              label={label}
              value={song[key]}
              onChange={(v) => setSong((s) => ({ ...s, [key]: v }))}
              multiline={key === "lyrics"}
            />
          ))}
          <Field
            label="Thời lượng (giây)"
            value={String(song.durationSeconds)}
            onChange={(v) =>
              setSong((s) => ({ ...s, durationSeconds: Number(v) }))
            }
          />
          <XStack alignItems="center" gap="2.5" flexWrap="wrap">
            <AppText>Đang hoạt động</AppText>
            <Toggle
              value={song.active}
              onValueChange={(v) => setSong((s) => ({ ...s, active: v }))}
              label="Đang hoạt động"
            />
          </XStack>
          <AppText variant="caption">Chọn nghệ sĩ để liên kết:</AppText>
          {data.artists
            .filter((x) => x.active)
            .map((x) => (
              <Button
                key={x.id}
                title={`${x.name} (${x.id})`}
                variant="secondary"
                onPress={() =>
                  setSong((s) => ({ ...s, artistId: x.id, artist: x.name }))
                }
              />
            ))}
          <Button
            title="Lưu bài hát"
            disabled={a.busy}
            onPress={() =>
              void a.run(async () => {
                await saveSong(songId, song);
                setSong(empty);
                setSongId(null);
                notify("Đã lưu bài hát.");
              })
            }
          />
          <Button
            title="Xóa form / hủy sửa"
            variant="secondary"
            onPress={() => {
              setSong(empty);
              setSongId(null);
            }}
          />
          <SectionTitle>Danh mục (kể cả bài đã ẩn)</SectionTitle>
          {data.songs.map((s) => (
            <SurfaceCard key={s.id}>
              <AppText>
                {s.title} · {s.active ? "Đang hiện" : "Đã ẩn"}
              </AppText>
              <AppText variant="caption">ID: {s.id}</AppText>
              <XStack alignItems="center" gap="2.5" flexWrap="wrap">
                <Button
                  title="Sửa"
                  variant="secondary"
                  onPress={() => {
                    const { id, cover, ...fields } = s;
                    setSongId(id);
                    setSong({ ...fields, coverUrl: cover });
                  }}
                />
                <Button
                  title="Ẩn"
                  variant="secondary"
                  disabled={a.busy}
                  onPress={() => void a.run(() => archiveSong(s.id))}
                />
                <Button
                  title="Xóa hẳn"
                  variant="secondary"
                  disabled={a.busy}
                  onPress={() =>
                    confirmDelete(
                      "Xóa hẳn bài hát? Các playlist có thể còn ID cũ. Nên dùng Ẩn nếu muốn khôi phục.",
                      () => void a.run(() => deleteSongPermanently(s.id)),
                    )
                  }
                />
              </XStack>
            </SurfaceCard>
          ))}
        </>
      ) : (
        <>
          <SectionTitle>
            {artistId ? "Sửa nghệ sĩ" : "Thêm nghệ sĩ"}
          </SectionTitle>
          <Field
            label="Tên nghệ sĩ"
            value={artist.name}
            onChange={(v) => setArtist((a) => ({ ...a, name: v }))}
          />
          <Field
            label="URL ảnh HTTPS"
            value={artist.imageUrl}
            onChange={(v) => setArtist((a) => ({ ...a, imageUrl: v }))}
          />
          <Field
            label="Giới thiệu"
            value={artist.biography}
            onChange={(v) => setArtist((a) => ({ ...a, biography: v }))}
            multiline
          />
          <XStack alignItems="center" gap="2.5" flexWrap="wrap">
            <AppText>Đang hoạt động</AppText>
            <Toggle
              value={artist.active}
              onValueChange={(v) => setArtist((a) => ({ ...a, active: v }))}
              label="Đang hoạt động"
            />
          </XStack>
          <Button
            title="Lưu nghệ sĩ"
            disabled={a.busy}
            onPress={() =>
              void a.run(async () => {
                await saveArtist(artistId, artist);
                setArtistId(null);
                setArtist({
                  name: "",
                  imageUrl: "",
                  biography: "",
                  active: true,
                });
                notify("Đã lưu nghệ sĩ.");
              })
            }
          />
          <Button
            title="Hủy sửa"
            variant="secondary"
            onPress={() => {
              setArtistId(null);
              setArtist({
                name: "",
                imageUrl: "",
                biography: "",
                active: true,
              });
            }}
          />
          {data.artists.map((x) => (
            <SurfaceCard key={x.id}>
              <AppText>
                {x.name} · {x.active ? "Đang hiện" : "Đã ẩn"}
              </AppText>
              <AppText variant="caption" userSelect="text">
                {x.id}
              </AppText>
              <XStack alignItems="center" gap="2.5" flexWrap="wrap">
                <Button
                  title="Sửa"
                  variant="secondary"
                  onPress={() => {
                    setArtistId(x.id);
                    setArtist({
                      name: x.name,
                      imageUrl: x.imageUrl,
                      biography: x.biography,
                      active: x.active,
                    });
                  }}
                />
                <Button
                  title="Ẩn"
                  variant="secondary"
                  disabled={a.busy}
                  onPress={() => void a.run(() => archiveArtist(x.id))}
                />
              </XStack>
            </SurfaceCard>
          ))}
        </>
      )}
    </Page>
  );
}
