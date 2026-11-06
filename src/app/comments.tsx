import { useLocalSearchParams } from "expo-router";
import CommentsScreen from "../screens/CommentsScreen";
import RequireAuth from "../components/RequireAuth";
import { ErrorText, Page } from "../components/ui/index";
import { BackButton } from "../components/ui/BackButton";
export default function Route() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return (
    <RequireAuth>
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
    </RequireAuth>
  );
}
