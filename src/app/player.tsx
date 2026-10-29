import Guard from "../components/Guard";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { usePlayer } from "../contexts/PlayerContext";
import { Page, Button, ErrorText, ui } from "../components/UI";
import Artwork from "../components/Artwork";
import { formatDuration } from "../utils/validation";

export default function Route() {
  const p = usePlayer();
  const [width, setWidth] = useState(1);
  const song = p.current;
  return (
    <Guard>
      <Page title="Đang phát">
        <Button
          title="‹ Về Home"
          secondary
          onPress={() => router.replace("/home")}
        />
        <ErrorText message={p.error} />
        {song ? (
          <>
            <View style={{ alignItems: "center", marginVertical: 25 }}>
              <Artwork uri={song.cover} size={260} radius={20} />
            </View>
            <Text style={ui.title}>{song.title}</Text>
            <Text style={ui.muted}>{song.artist}</Text>
            {song.audioKey && !song.audioUrl && (
              <Text style={ui.small}>
                Âm thanh tổng hợp demo do ứng dụng cung cấp, không phải bản thu
                thương mại.
              </Text>
            )}
            <Pressable
              accessibilityLabel="Tua nhạc"
              onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
              onPress={(e) =>
                void p.seek((e.nativeEvent.locationX / width) * p.duration)
              }
              style={{ height: 25, justifyContent: "center", marginTop: 24 }}
            >
              <View
                style={{ height: 5, backgroundColor: "#ddd", borderRadius: 8 }}
              >
                <View
                  style={{
                    height: 5,
                    width: `${p.duration ? Math.min(100, (p.position / p.duration) * 100) : 0}%`,
                    backgroundColor: "#087e78",
                    borderRadius: 8,
                  }}
                />
              </View>
            </Pressable>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text>{formatDuration(p.position)}</Text>
              <Text>{formatDuration(p.duration)}</Text>
            </View>
            <View
              style={[ui.row, { justifyContent: "center", marginVertical: 15 }]}
            >
              <Button title="⏮" onPress={p.previous} />
              <Button
                title={
                  p.loading ? "Đang tải..." : p.playing ? "Tạm dừng" : "Phát"
                }
                onPress={p.toggle}
              />
              <Button title="⏭" onPress={p.next} />
            </View>
            <Button
              title={p.repeat ? "Lặp một bài: Bật" : "Lặp một bài: Tắt"}
              secondary
              onPress={() => p.setRepeat(!p.repeat)}
            />
            <Button
              title="Lời bài hát"
              secondary
              onPress={() =>
                router.push({ pathname: "/lyrics", params: { id: song.id } })
              }
            />
            <Button
              title="Chi tiết bài hát"
              secondary
              onPress={() =>
                router.push({ pathname: "/song", params: { id: song.id } })
              }
            />
          </>
        ) : (
          <Text style={ui.muted}>Chọn một bài hát ở Home trước.</Text>
        )}
      </Page>
    </Guard>
  );
}
