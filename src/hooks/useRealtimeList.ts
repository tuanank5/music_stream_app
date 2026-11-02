import { useEffect, useState } from "react";
import { errorMessage } from "../utils/feedback";

type Subscription<T> = (
  next: (items: T[]) => void,
  fail: (error: Error) => void,
) => () => void;

// Screens provide a stable service subscription; the hook owns its lifecycle.
export function useRealtimeList<T>(subscribe: Subscription<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    const stop = subscribe(
      (values) => {
        if (!live) return;
        setItems(values);
        setLoading(false);
        setError("");
      },
      (error) => {
        if (!live) return;
        setError(errorMessage(error));
        setLoading(false);
      },
    );
    return () => {
      live = false;
      stop();
    };
  }, [subscribe]);
  return { items, loading, error };
}
