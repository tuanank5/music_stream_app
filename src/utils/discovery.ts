import type { Song } from "../types/domain";

// Trộn bản sao, không thay đổi danh sách gốc.
export function shuffleSongs(
  songs: Song[],
  random: () => number = Math.random,
): Song[] {
  const result = [...songs];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));

    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}
