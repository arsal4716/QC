// hooks/useFilters.js
import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';
import { setFilters, resetFilters } from '../store/slices/filtersSlice';

export const useFilters = (initialFilters = {}) => {
  const dispatch = useDispatch();
  const filters = useSelector((state) => state.filters);

  const updateFilters = useCallback((newFilters) => {
    dispatch(setFilters(newFilters));
  }, [dispatch]);

  const reset = useCallback(() => {
    dispatch(resetFilters());
  }, [dispatch]);

  return {
    filters,
    updateFilters,
    resetFilters: reset,
  };
};