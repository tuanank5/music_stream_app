import Guard from "../components/Guard";
import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useData } from "../contexts/DataContext";
import { Field, Page, ui, Button } from "../components/UI";
import SongRow from "../components/SongRow";
import { normalizeSearch } from "../utils/validation";

export default function Route() {
  const data = useData();
  const [keyword, setKeyword] = useState(""),
    [tab, setTab] = useState<"tracks" | "artists">("tracks");
  const q = normalizeSearch(keyword);
  const songs = useMemo(
    () =>
      data.songs.filter(
        (s) =>
          s.active &&
          normalizeSearch(s.title + " " + s.artist + " " + s.album).includes(q),
      ),
    [q, data.songs],
  );
  const artists = data.artists.filter(
    (a) => a.active && normalizeSearch(a.name).includes(q),
  );
  return (
    <Guard>
      <Page title="Search">
        <Field
          label="Tên bài hát, nghệ sĩ hoặc album"
          value={keyword}
          onChange={setKeyword}
        />
        <View style={ui.row}>
          <Button
            title="Tracks"
            secondary={tab !== "tracks"}
            onPress={() => setTab("tracks")}
          />
          <Button
            title="Artists"
            secondary={tab !== "artists"}
            onPress={() => setTab("artists")}
          />
          <Button
            title="Xóa từ khóa"
            secondary
            onPress={() => setKeyword("")}
          />
        </View>
        {tab === "tracks" ? (
          <>
            <Text style={ui.heading}>{songs.length} bài hát</Text>
            {songs.map((s) => (
              <SongRow key={s.id} song={s} queue={songs} />
            ))}
            {!songs.length && <Text style={ui.muted}>Không có kết quả.</Text>}
          </>
        ) : (
          <>
            <Text style={ui.heading}>{artists.length} nghệ sĩ</Text>
            {artists.map((a) => (
              <Pressable
                style={ui.card}
                key={a.id}
                onPress={() =>
                  router.push({ pathname: "/artist", params: { id: a.id } })
                }
              >
                <Text>{a.name} ›</Text>
              </Pressable>
            ))}
            {!artists.length && (
              <Text style={ui.muted}>Không có nghệ sĩ phù hợp.</Text>
            )}
          </>
        )}
      </Page>
    </Guard>
  );
}
