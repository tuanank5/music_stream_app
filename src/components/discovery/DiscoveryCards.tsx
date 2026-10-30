import React, { useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

import type { Artist } from "../../types/domain";
import type {
  ChartTheme,
  MusicChart,
} from "../../types/discovery";

import { useAuth } from "../../contexts/AuthContext";
import { useData } from "../../contexts/DataContext";
import { useAction } from "../../hooks/useAction";
import { setFollow } from "../../services/libraryService";
import { ErrorText } from "../UI";

// Ảnh chân dung nghệ sĩ.
export function ArtistAvatar({
  artist,
  size = 100,
}: {
  artist: Artist;
  size?: number;
}) {
  const [failedUri, setFailedUri] = useState("");

  const initials = artist.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      {artist.imageUrl &&
      failedUri !== artist.imageUrl ? (
        <Image
          source={{ uri: artist.imageUrl }}
          style={{
            width: size,
            height: size,
          }}
          onError={() =>
            setFailedUri(artist.imageUrl)
          }
        />
      ) : (
        <>
          <Ionicons
            name="person"
            size={size * 0.37}
            color="#79a9ac"
          />

          <Text
            numberOfLines={1}
            style={{
              color: "#39777c",
              fontWeight: "700",
              fontSize: Math.max(10, size * 0.13),
            }}
          >
            {initials}
          </Text>
        </>
      )}
    </View>
  );
}

// Theo dõi/bỏ theo dõi nghệ sĩ.
export function FollowButton({
  artistId,
}: {
  artistId: string;
}) {
  const { user } = useAuth();
  const { followingIds } = useData();
  const action = useAction();

  const following = followingIds.includes(artistId);

  return (
    <View style={styles.center}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          following
            ? "Bỏ theo dõi nghệ sĩ"
            : "Theo dõi nghệ sĩ"
        }
        disabled={action.busy || !user || user.uid === artistId}
        onPress={() => {
          if (!user) return;

          void action.run(() =>
            setFollow(
              user.uid,
              artistId,
              !following,
            ),
          );
        }}
        style={[
          styles.follow,
          following && styles.following,
          action.busy && { opacity: 0.5 },
        ]}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            color: following ? "#20252d" : "white",
          }}
        >
          {following ? "Following" : "Follow"}
        </Text>
      </Pressable>

      <ErrorText message={action.error} />
    </View>
  );
}

// Thẻ nghệ sĩ trên Home.
export function ArtistCard({
  artist,
}: {
  artist: Artist;
}) {
  return (
    <View style={styles.artistCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Xem nghệ sĩ ${artist.name}`}
        style={styles.center}
        onPress={() =>
          router.push({
            pathname: "/artist",
            params: { id: artist.id },
          })
        }
      >
        <ArtistAvatar artist={artist} size={96} />

        <Text
          numberOfLines={2}
          style={styles.artistName}
        >
          {artist.name}
        </Text>
      </Pressable>

      <FollowButton artistId={artist.id} />
    </View>
  );
}

const palettes: Record<
  ChartTheme,
  readonly [string, string, string]
> = {
  violet: ["#ffe7a1", "#8d3df1", "#4311a5"],
  cyan: ["#bef7f1", "#36c7e5", "#267bd4"],
  pink: ["#ffd4b3", "#eb77bb", "#9254cf"],
};

// Bìa chart: dùng ảnh nếu có, nếu không dùng gradient.
export function ChartCover({
  chart,
  size = 144,
}: {
  chart: MusicChart;
  size?: number;
}) {
  const [failedUri, setFailedUri] = useState("");

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <LinearGradient
        colors={palettes[chart.theme]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.chartGradient}
      >
        <View
          style={{
            position: "absolute",
            width: size * 1.5,
            height: size * 0.4,
            top: -size * 0.04,
            backgroundColor: "#ffffff28",
            transform: [{ rotate: "-25deg" }],
          }}
        />

        <Text
          numberOfLines={2}
          style={{
            fontSize: size * 0.19,
            fontWeight: "900",
            color: "white",
            textAlign: "center",
          }}
        >
          {chart.title}
        </Text>

        <Text
          numberOfLines={1}
          style={{
            fontSize: size * 0.09,
            color: "white",
            marginTop: 10,
          }}
        >
          {chart.subtitle}
        </Text>
      </LinearGradient>

      {chart.coverUrl &&
      failedUri !== chart.coverUrl ? (
        <Image
          source={{ uri: chart.coverUrl }}
          style={{
            position: "absolute",
            width: size,
            height: size,
          }}
          onError={() =>
            setFailedUri(chart.coverUrl)
          }
        />
      ) : null}
    </View>
  );
}

// Thẻ chart trên Home và trang Charts.
export function ChartCard({
  chart,
}: {
  chart: MusicChart;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        `Mở chart ${chart.title} ${chart.subtitle}`
      }
      style={{ width: 144, marginRight: 14 }}
      onPress={() =>
        router.push({
          pathname: "/chart",
          params: { id: chart.id },
        })
      }
    >
      <ChartCover chart={chart} />

      <Text
        numberOfLines={2}
        style={styles.chartDescription}
      >
        {chart.description ||
          "Danh sách được tuyển chọn"}
      </Text>
    </Pressable>
  );
}

// Tiêu đề từng mục và nút See all.
export function SectionHeading({
  title,
  onPress,
}: {
  title: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>
        {title}
      </Text>

      {onPress ? (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={{ padding: 8 }}
        >
          <Text
            style={{
              fontSize: 12,
              color: "#848a94",
            }}
          >
            See all
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// Dùng trong trang nghệ sĩ và chart.
export function BackButton({
  fallback = "/home",
}: {
  fallback?: "/home" | "/charts";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Quay lại"
      style={styles.backButton}
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace(fallback);
        }
      }}
    >
      <Ionicons
        name="chevron-back"
        size={25}
        color="#20252d"
      />
    </Pressable>
  );
}

// Các trang chi tiết import bộ style này.
export const discoveryStyles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: 1000,
    alignSelf: "center",
    paddingBottom: 12,
  },
  title: {
    fontSize: 25,
    fontWeight: "800",
    color: "#20252d",
  },
  muted: {
    fontSize: 13,
    color: "#848a94",
    lineHeight: 21,
  },
  roundPlay: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#191d24",
    alignItems: "center",
    justifyContent: "center",
  },
});

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
  },
  avatar: {
    overflow: "hidden",
    backgroundColor: "#e5f4f5",
    alignItems: "center",
    justifyContent: "center",
  },
  artistCard: {
    width: 112,
    marginRight: 16,
    alignItems: "center",
  },
  artistName: {
    fontWeight: "600",
    fontSize: 13,
    textAlign: "center",
    minHeight: 36,
    marginTop: 10,
    color: "#242930",
  },
  follow: {
    borderWidth: 1,
    borderColor: "#191d24",
    backgroundColor: "#191d24",
    borderRadius: 24,
    paddingVertical: 7,
    paddingHorizontal: 18,
    marginTop: 8,
    minWidth: 74,
    alignItems: "center",
  },
  following: {
    backgroundColor: "white",
    borderColor: "#b8c0c9",
  },
  chartGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  chartDescription: {
    fontSize: 12,
    color: "#777e89",
    lineHeight: 18,
    marginTop: 8,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#20252d",
  },
  backButton: {
    alignSelf: "flex-start",
    padding: 8,
    marginLeft: -8,
    marginBottom: 12,
  },
});