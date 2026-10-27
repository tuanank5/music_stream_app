import { Song } from "../types/Song";

export const sampleSongs: Song[] = [
  {
    id: "1",
    title: "FLOWER",
    artist: "Jessica Gonzalez",
    album: "Top 50",
    duration: "3:24",
    cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400",
  },
  {
    id: "2",
    title: "Shape of You",
    artist: "Ed Sheeran",
    album: "÷",
    duration: "3:53",
    cover: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400",
  },
  {
    id: "3",
    title: "Blinding Lights",
    artist: "The Weeknd",
    album: "After Hours",
    duration: "3:20",
    cover: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400",
  },
  {
    id: "4",
    title: "Levitating",
    artist: "Dua Lipa",
    album: "Future Nostalgia",
    duration: "3:23",
    cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400",
  },
  {
    id: "5",
    title: "Astronaut in the Ocean",
    artist: "Masked Wolf",
    album: "Single",
    duration: "2:12",
    cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400",
  },
  {
    id: "6",
    title: "Dynamite",
    artist: "BTS",
    album: "BE",
    duration: "3:19",
    cover: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400",
  },
];
export function useSongs() {
  return { songs: sampleSongs, isLoading: false, error: null as string | null };
}
