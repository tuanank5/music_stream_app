import { getFirebaseAuth } from "./firebase";
import { backendGet } from "./backendService";
import type { SearchHistoryItem } from "../utils/searchHistory";
export async function validateSearchHistoryItem(
  item: SearchHistoryItem,
  uid: string,
) {
  if (getFirebaseAuth().currentUser?.uid !== uid) return false;
  const result = await backendGet<{ accessible: boolean }>("/access", {
    kind: item.kind,
    id: item.id,
  });
  return result.accessible && getFirebaseAuth().currentUser?.uid === uid;
}
