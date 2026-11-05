import { collection, doc } from "firebase/firestore";
import { getFirebaseDb, getFirebaseAuth } from "./firebase";
import { cleanText } from "../utils/validation";
import { backendPost, backendPatch, backendDelete } from "./backendService";
export function newSubmissionId() {
  return doc(collection(getFirebaseDb(), "posts")).id;
}
function requireAccount(uid: string) {
  if (getFirebaseAuth().currentUser?.uid !== uid)
    throw new Error("Phiên đăng nhập đã thay đổi.");
}
export async function createPost(
  uid: string,
  content: string,
  songId: string,
  key?: string,
) {
  requireAccount(uid);
  return backendPost(
    "/posts",
    {
      content: cleanText(content, "nội dung", 2000),
      songId,
    },
    key,
  );
}
export function updatePost(id: string, content: string) {
  return backendPatch(`/posts/${encodeURIComponent(id)}`, {
    content: cleanText(content, "nội dung", 2000),
  });
}
export function archivePost(id: string) {
  return backendDelete(`/posts/${encodeURIComponent(id)}`);
}
export async function createComment(
  postId: string,
  uid: string,
  content: string,
  key?: string,
) {
  requireAccount(uid);
  return backendPost(
    `/posts/${encodeURIComponent(postId)}/comments`,
    {
      content: cleanText(content, "bình luận", 1000),
    },
    key,
  );
}
export function updateComment(postId: string, id: string, content: string) {
  return backendPatch(
    `/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(id)}`,
    {
      content: cleanText(content, "bình luận", 1000),
    },
  );
}
export function deleteComment(postId: string, id: string) {
  return backendDelete(
    `/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(id)}`,
  );
}
