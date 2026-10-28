import {
  addDoc,
  collection,
  doc,
  deleteDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { getFirebaseDb } from "./firebase";
import { Comment, FeedPost } from "../types/domain";
import { cleanText } from "../utils/validation";
export function watchPosts(
  next: (p: FeedPost[]) => void,
  fail: (e: Error) => void,
) {
  return onSnapshot(
    query(
      collection(getFirebaseDb(), "posts"),
      orderBy("createdAt", "desc"),
      limit(50),
    ),
    (s) =>
      next(
        s.docs.map((d) => {
          const x = d.data();
          return {
            id: d.id,
            ownerId: x.ownerId,
            authorName: x.authorName,
            content: x.content,
            songId: x.songId,
            active: x.active,
            createdAt: x.createdAt?.toMillis?.() ?? 0,
          };
        }),
      ),
    fail,
  );
}
export function createPost(
  uid: string,
  authorName: string,
  content: string,
  songId: string,
) {
  return addDoc(collection(getFirebaseDb(), "posts"), {
    ownerId: uid,
    authorName: authorName || "Người dùng",
    content: cleanText(content, "nội dung", 2000),
    songId,
    active: true,
    createdAt: serverTimestamp(),
  });
}
export function updatePost(id: string, content: string) {
  return updateDoc(doc(getFirebaseDb(), "posts", id), {
    content: cleanText(content, "nội dung", 2000),
  });
}
export function archivePost(id: string) {
  return updateDoc(doc(getFirebaseDb(), "posts", id), { active: false });
}
export function watchComments(
  postId: string,
  next: (c: Comment[]) => void,
  fail: (e: Error) => void,
) {
  return onSnapshot(
    query(
      collection(getFirebaseDb(), "posts", postId, "comments"),
      orderBy("createdAt", "desc"),
      limit(100),
    ),
    (s) =>
      next(
        s.docs.map((d) => {
          const x = d.data();
          return {
            id: d.id,
            ownerId: x.ownerId,
            authorName: x.authorName,
            content: x.content,
            createdAt: x.createdAt?.toMillis?.() ?? 0,
          };
        }),
      ),
    fail,
  );
}
export function createComment(
  postId: string,
  uid: string,
  authorName: string,
  content: string,
) {
  return addDoc(collection(getFirebaseDb(), "posts", postId, "comments"), {
    ownerId: uid,
    authorName: authorName || "Người dùng",
    content: cleanText(content, "bình luận", 1000),
    createdAt: serverTimestamp(),
  });
}
export function updateComment(postId: string, id: string, content: string) {
  return updateDoc(doc(getFirebaseDb(), "posts", postId, "comments", id), {
    content: cleanText(content, "bình luận", 1000),
  });
}
export function deleteComment(postId: string, id: string) {
  return deleteDoc(doc(getFirebaseDb(), "posts", postId, "comments", id));
}
