import { useMemo } from "react";
import { useHistoryPage } from "../hooks/useHistoryPage";
import LoadMore from "../components/LoadMore";
import { BackButton } from "../components/ui/BackButton";
import SongRow from "../components/SongRow";
import { EmptyState, ErrorText, ListPage } from "../components/ui/index";

export default function HistoryScreen() {
  const history = useHistoryPage();
  const rows = history.items;
  const queue = useMemo(() => rows.map((row) => row.song), [rows]);
  return (
    <ListPage
      title="Lịch sử"
      titleLeading={<BackButton inline fallback="/library" />}
      data={rows}
      onEndReached={() => {
        if (history.started && !history.error) void history.loadMore();
      }}
      keyExtractor={(row) => row.song.id}
      header={<ErrorText message={history.error} />}
      renderItem={({ song }) => <SongRow song={song} queue={queue} />}
      footer={
        <>
          {!history.loading &&
            history.started &&
            !rows.length &&
            !history.hasMore && (
              <EmptyState message="Chưa có bài hát khả dụng trong lịch sử nghe." />
            )}
          <LoadMore {...history} />
        </>
      }
    />
  );
}
