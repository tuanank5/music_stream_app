import { useLocalSearchParams } from "expo-router";
import CommentsScreen from "../components/CommentsScreen";
import Guard from "../components/Guard";
import { ErrorText, Page } from "../components/UI";
import { BackButton } from "../components/discovery/BackButton";
export default function Route() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return (
    <Guard>
      {id ? (
        <CommentsScreen key={id} postId={id} />
      ) : (
        <Page
          title="Bình luận"
          titleLeading={<BackButton inline fallback="/feed" />}
        >
          <ErrorText message="Thiếu ID bài đăng." />
        </Page>
      )}
    </Guard>
  );
}
