import { useEffect, useState } from "react";
import { useCatalogData } from "../contexts/DataContext";
import { errorMessage } from "../utils/feedback";

export function useSongDetail(id: string) {
  const { ensureSong } = useCatalogData();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    ensureSong(id)
      .catch((error) => {
        if (live) setError(errorMessage(error));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [id, ensureSong]);
  return { error, loading };
}
