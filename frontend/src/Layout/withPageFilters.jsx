import React from 'react';
import { useFilters } from '../hooks/useFilters';
import TopBar from '../components/TopBar';
import FiltersPanel from '../components/FiltersPanel';
import useAutoRefresh from '../hooks/useAutoRefresh';
import { useState } from 'react';
const withPageFilters = (WrappedComponent, initialFilters = { datePreset: "today" }) => {
  return (props) => {
    const {
      filters,
      selectedCampaigns,
      selectedPublishers,
      refreshKey,
      setSelectedCampaigns,
      setSelectedPublishers,
      updateFilters,
      resetFilters
    } = useFilters(initialFilters);

    const [filtersVisible, setFiltersVisible] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(false);
    
    // useAutoRefresh(autoRefresh, 15000, () => setRefreshKey(prev => prev + 1));

    const handleApplyFilters = (payload) => {
      updateFilters(payload);
      setFiltersVisible(false);
    };

    return (
      <div className="container-fluid">
        <TopBar
          onToggleFilters={() => setFiltersVisible(v => !v)}
          autoRefresh={autoRefresh}
          setAutoRefresh={setAutoRefresh}
          rangeLabel={filters.datePreset}
          onApplyPublishers={setSelectedPublishers}
          onApplyCampaigns={setSelectedCampaigns}
          selectedCampaigns={selectedCampaigns}
          selectedPublishers={selectedPublishers}
        />

        <WrappedComponent
          {...props}
          filters={filters}
          refreshKey={refreshKey}
          selectedCampaigns={selectedCampaigns}
          selectedPublishers={selectedPublishers}
          onResetFilters={resetFilters}
        />

        <FiltersPanel
          visible={filtersVisible}
          onApply={handleApplyFilters}
          onClose={() => setFiltersVisible(false)}
          initial={filters}
          selectedCampaigns={selectedCampaigns}
          setSelectedCampaigns={setSelectedCampaigns}
          selectedPublishers={selectedPublishers}
          setSelectedPublishers={setSelectedPublishers}
        />
      </div>
    );
  };
};

export default withPageFilters;