export type ChartTheme = "violet" | "cyan" | "pink";

export type MusicChart = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  coverUrl: string;
  theme: ChartTheme;
  songIds: string[];
  active: boolean;
  order: number;
};