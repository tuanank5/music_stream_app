import Guard from "../components/Guard";
import React, { useState } from "react";
import { Switch, Text, View } from "react-native";
import { useData } from "../contexts/DataContext";
import { useAction } from "../hooks/useAction";
import { SongInput } from "../types/domain";
import {
  archiveArtist,
  archiveSong,
  deleteSongPermanently,
  saveArtist,
  saveSong,
} from "../services/catalogService";
import { Button, ErrorText, Field, Page, ui } from "../components/UI";
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

export default function Route() {
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
    <Guard admin>
      <Page title="Quản trị">
        <View style={ui.row}>
          <Button
            title="Bài hát"
            secondary={tab !== "songs"}
            onPress={() => setTab("songs")}
          />
          <Button
            title="Nghệ sĩ"
            secondary={tab !== "artists"}
            onPress={() => setTab("artists")}
          />
        </View>
        <ErrorText message={a.error} />
        {tab === "songs" ? (
          <>
            <Text style={ui.heading}>
              {songId ? "Sửa bài hát" : "Thêm bài hát"}
            </Text>
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
            <View style={ui.row}>
              <Text>Đang hoạt động</Text>
              <Switch
                value={song.active}
                onValueChange={(v) => setSong((s) => ({ ...s, active: v }))}
              />
            </View>
            <Text style={ui.small}>Chọn nghệ sĩ để liên kết:</Text>
            {data.artists
              .filter((x) => x.active)
              .map((x) => (
                <Button
                  key={x.id}
                  title={`${x.name} (${x.id})`}
                  secondary
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
              secondary
              onPress={() => {
                setSong(empty);
                setSongId(null);
              }}
            />
            <Text style={ui.heading}>Danh mục (kể cả bài đã ẩn)</Text>
            {data.songs.map((s) => (
              <View style={ui.card} key={s.id}>
                <Text>
                  {s.title} · {s.active ? "Đang hiện" : "Đã ẩn"}
                </Text>
                <Text style={ui.small}>ID: {s.id}</Text>
                <View style={ui.row}>
                  <Button
                    title="Sửa"
                    secondary
                    onPress={() => {
                      const { id, cover, ...fields } = s;
                      setSongId(id);
                      setSong({ ...fields, coverUrl: cover });
                    }}
                  />
                  <Button
                    title="Ẩn"
                    secondary
                    disabled={a.busy}
                    onPress={() => void a.run(() => archiveSong(s.id))}
                  />
                  <Button
                    title="Xóa hẳn"
                    secondary
                    disabled={a.busy}
                    onPress={() =>
                      confirmDelete(
                        "Xóa hẳn bài hát? Các playlist có thể còn ID cũ. Nên dùng Ẩn nếu muốn khôi phục.",
                        () => void a.run(() => deleteSongPermanently(s.id)),
                      )
                    }
                  />
                </View>
              </View>
            ))}
          </>
        ) : (
          <>
            <Text style={ui.heading}>
              {artistId ? "Sửa nghệ sĩ" : "Thêm nghệ sĩ"}
            </Text>
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
            <View style={ui.row}>
              <Text>Đang hoạt động</Text>
              <Switch
                value={artist.active}
                onValueChange={(v) => setArtist((a) => ({ ...a, active: v }))}
              />
            </View>
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
              secondary
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
              <View key={x.id} style={ui.card}>
                <Text>
                  {x.name} · {x.active ? "Đang hiện" : "Đã ẩn"}
                </Text>
                <Text selectable style={ui.small}>
                  {x.id}
                </Text>
                <View style={ui.row}>
                  <Button
                    title="Sửa"
                    secondary
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
                    secondary
                    disabled={a.busy}
                    onPress={() => void a.run(() => archiveArtist(x.id))}
                  />
                </View>
              </View>
            ))}
          </>
        )}
      </Page>
    </Guard>
  );
}
