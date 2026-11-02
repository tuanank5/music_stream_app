import { useData } from "../contexts/DataContext";
import { useMemo } from "react";
import { genreCharts } from "../utils/recommendations";

export function useCharts() {
  const data = useData();
  const charts = useMemo(() => genreCharts(data.songs), [data.songs]);

  return {
    charts,
    loading: data.loading,
    error: data.errors.filter((error) => error.startsWith("Songs:")).join("\n"),
  };
}
