import { Button, ErrorText, Loading } from "./ui/index";
export default function LoadMore({
  loading,
  error,
  hasMore,
  loadMore,
  started = true,
  showLoading = true,
}: {
  loading: boolean;
  error: string;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  started?: boolean;
  showLoading?: boolean;
}) {
  return (
    <>
      <ErrorText message={error} />
      {loading || (!started && !error) ? (
        showLoading ? (
          <Loading />
        ) : null
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
