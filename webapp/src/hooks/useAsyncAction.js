import { useState, useCallback } from 'react';

/**
 * Hook for managing async actions with loading state and error handling.
 *
 * @param {Function} asyncFn - The async function to execute
 * @param {Object} options
 * @param {number} options.loadingDelay - Delay in ms before showing spinner (default 300ms)
 * @returns {{ execute: Function, isExecuting: boolean, showSpinner: boolean, error: string|null, clearError: Function }}
 */
function useAsyncAction(asyncFn, options = {}) {
  const { loadingDelay = 300 } = options;
  const [isExecuting, setIsExecuting] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const [error, setError] = useState(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const execute = useCallback(
    async (...args) => {
      setIsExecuting(true);
      setError(null);

      const spinnerTimer = setTimeout(() => {
        setShowSpinner(true);
      }, loadingDelay);

      try {
        const result = await asyncFn(...args);
        return result;
      } catch (err) {
        const message =
          err?.response?.data?.error ||
          err?.message ||
          'An unexpected error occurred';
        setError(message);
        throw err;
      } finally {
        clearTimeout(spinnerTimer);
        setIsExecuting(false);
        setShowSpinner(false);
      }
    },
    [asyncFn, loadingDelay]
  );

  return { execute, isExecuting, showSpinner, error, clearError };
}

export default useAsyncAction;
