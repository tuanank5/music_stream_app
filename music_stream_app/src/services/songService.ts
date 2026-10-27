import { Song } from "../types/Song";

// TODO (phối hợp data/backend): xác định schema Firestore và quy tắc visibility/moderation trước khi implement.
export async function getSongs(): Promise<Song[]> {
  // Chưa kết nối Firestore; không trả dữ liệu mẫu như thể đến từ backend.
  return [];
}
