import { useData } from "../contexts/DataContext";
import { genreCharts } from "../utils/recommendations";

export function useCharts() {
  const data = useData();

  return {
    charts: genreCharts(data.songs),
    loading: data.loading,
    error: data.errors
      .filter(error => error.startsWith("Songs:"))
      .join("\n"),
  };
}