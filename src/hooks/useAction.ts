import { useState } from "react";
import { errorMessage } from "../utils/feedback";
export function useAction() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function run(work: () => Promise<unknown>) {
    if (busy) return false;
    setBusy(true);
    setError("");
    try {
      await work();
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, setError, run };
}
