import { useState, useCallback } from 'react';

export const useFilters = (initialFilters = { datePreset: "today" }) => {
  const [filters, setFilters] = useState(initialFilters);
  const [selectedCampaigns, setSelectedCampaigns] = useState([]);
  const [selectedPublishers, setSelectedPublishers] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setRefreshKey(prev => prev + 1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
    setSelectedCampaigns([]);
    setSelectedPublishers([]);
    setRefreshKey(prev => prev + 1);
  }, [initialFilters]);

  return {
    filters,
    selectedCampaigns,
    selectedPublishers,
    refreshKey,
    setSelectedCampaigns,
    setSelectedPublishers,
    updateFilters,
    resetFilters
  };
};