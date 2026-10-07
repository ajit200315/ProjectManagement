import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Loads data on mount and exposes a refresh for after a mutation.
 *
 * Ignores a response that arrives after the component unmounted or after
 * the dependencies changed, so a slow request cannot overwrite newer data
 * or set state on something that is gone.
 *
 * `load` is called with no arguments; pass it via useCallback so this does
 * not re-run on every render.
 */
export const useResource = (load) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Bumped on every run; only the newest run may commit its result.
  const runRef = useRef(0);

  const refresh = useCallback(async () => {
    const run = ++runRef.current;
    try {
      const result = await load();
      if (run === runRef.current) {
        setData(result);
        setError("");
      }
    } catch (err) {
      if (run === runRef.current) {
        setError(err.message);
      }
    } finally {
      if (run === runRef.current) {
        setLoading(false);
      }
    }
  }, [load]);

  useEffect(() => {
    // Fetching is exactly the "synchronizing with an external system" case
    // this rule exempts; the setState calls happen after an await, not
    // synchronously during the effect.
    // eslint-disable-next-line react/set-state-in-effect
    refresh();
    return () => {
      // Invalidate the in-flight run so it cannot commit after unmount.
      runRef.current += 1;
    };
  }, [refresh]);

  return { data, loading, error, refresh, setError };
};
