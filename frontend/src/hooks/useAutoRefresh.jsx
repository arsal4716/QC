import { useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';

export const useAutoRefresh = (callback, dependencies = []) => {
  const autoRefresh = useSelector((state) => state.ui.autoRefresh);
  const refreshInterval = useSelector((state) => state.ui.refreshInterval);
  const callbackRef = useRef(callback);

  const memoizedCallback = useCallback(() => {
    callbackRef.current();
  }, []);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!autoRefresh || !refreshInterval) return;

    const interval = setInterval(memoizedCallback, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, memoizedCallback, ...dependencies]);

  return null;
};