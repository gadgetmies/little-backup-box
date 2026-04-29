import { useState, useCallback } from 'react';

/**
 * A hook that wraps an async action with loading and error state.
 * @param {Function} asyncFn - The async function to call
 * @returns {{ execute, loading, error, clearError }}
 */
function useAsyncAction(asyncFn) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        const result = await asyncFn(...args);
        return result;
      } catch (err) {
        const message =
          err?.response?.data?.error || err?.message || 'An error occurred';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [asyncFn]
  );

  const clearError = useCallback(() => setError(null), []);

  return { execute, loading, error, clearError };
}

export default useAsyncAction;
