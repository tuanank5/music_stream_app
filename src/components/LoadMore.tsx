import { Button, ErrorText, Loading } from "./UI";
export default function LoadMore({
  loading,
  error,
  hasMore,
  loadMore,
  started = true,
}: {
  loading: boolean;
  error: string;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  started?: boolean;
}) {
  return (
    <>
      <ErrorText message={error} />
      {loading || (!started && !error) ? (
        <Loading />
      ) : hasMore ? (
        <Button
          title={error ? "Thử lại" : "Tải thêm"}
          variant="secondary"
          onPress={() => {
            void loadMore();
          }}
        />
      ) : null}
    </>
  );
}
