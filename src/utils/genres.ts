export const GENRES = [
  "Pop",
  "Rock",
  "Indie",
  "Acoustic",
  "Ballad",
  "R&B",
  "Hip-hop/Rap",
  "EDM",
  "Jazz",
  "Blues",
  "Classical",
  "Country",
  "Folk",
  "Latin",
  "Reggae",
  "Bolero",
  "Nhạc dân gian",
  "Nhạc không lời",
  "Khác",
] as const;

export function validateGenres(values: readonly string[]): string[] {
  const unique = [...new Set(values)];
  if (
    !unique.length ||
    unique.length > 10 ||
    unique.some((value) => !(GENRES as readonly string[]).includes(value))
  ) {
    throw new Error("Chọn từ 1 đến 10 thể loại trong danh sách.");
  }
  return unique;
}
