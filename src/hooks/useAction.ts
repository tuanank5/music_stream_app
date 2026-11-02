import { useCallback, useRef, useState } from "react";
import { errorMessage } from "../utils/feedback";
export function useAction() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef(false);
  const run = useCallback(async (work: () => Promise<unknown>) => {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await work();
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }, []);
  return { busy, error, setError, run };
}
