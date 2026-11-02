import { useCatalogData } from "../contexts/DataContext";
import { useMemo } from "react";
import { genreCharts } from "../utils/recommendations";

export function useCharts() {
  const data = useCatalogData();
  const charts = useMemo(() => genreCharts(data.songs), [data.songs]);

  return {
    charts,
    loading: data.loadingSources.songs,
    error: data.errors.filter((error) => error.startsWith("Songs:")).join("\n"),
  };
}
