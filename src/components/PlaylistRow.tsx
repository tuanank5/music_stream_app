import { router } from "expo-router";

import { type PublicPlaylist } from "../hooks/useUserPlaylists";
import { MediaRow } from "./MediaRow";
import Artwork from "./Artwork";

export function PlaylistRow({ item }: { item: PublicPlaylist }) {
  return (
    <MediaRow
      title={item.name}
      subtitle={`${item.ownerName} · Playlist · ${item.songCount} bài hát`}
      leading={<Artwork uri={item.coverUrl} size={70} radius={4} />}
      onPress={() =>
        router.push({
          pathname: "/playlist",
          params: { id: item.id, ownerId: item.ownerId },
        })
      }
    />
  );
}
