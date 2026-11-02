import React from "react";

import SongRow from "./SongRow";
import { AppText, EmptyState, ListPage, Loading } from "./UI";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { BackButton } from "./discovery/BackButton";
export default function MyUploadsScreen() {
  const { user } = useAuth();
  const data = useData();
  const songs = data.songs.filter(
    (song) => song.artistId === user?.uid && song.active,
  );
  return (
    <ListPage
      title="Bài hát tôi đã đăng"
      titleLeading={<BackButton inline fallback="/library" />}
      data={songs}
      renderItem={(song) => (
        <React.Fragment key={song.id}>
          <AppText variant="caption">{song.visibility}</AppText>

          <SongRow song={song} queue={songs} />
        </React.Fragment>
      )}
      keyExtractor={(item) => item.id}
      header={<></>}
      footer={
        <>
          {data.loading ? (
            <Loading />
          ) : !songs.length ? (
            <EmptyState message="Bạn chưa đăng bài hát." />
          ) : null}
        </>
      }
    />
  );
}
