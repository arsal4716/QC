// src/Layout/withPageFilters.jsx
import React, { useCallback, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useFilters } from "../hooks/useFilters";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import TopBar from "../components/Layout/TopBar";
import FiltersPanel from "../components/FiltersPanel";

const withPageFilters = (
  WrappedComponent,
  initialFilters = { datePreset: "today" }
) => {
  const ComponentWithFilters = (props) => {
    const dispatch = useDispatch();
    const { filters, updateFilters, resetFilters } = useFilters(initialFilters);

    const [filtersVisible, setFiltersVisible] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    
    const selectedCampaigns = useSelector(state => state.filters.selectedCampaigns || []);
    const selectedPublishers = useSelector(state => state.filters.selectedPublishers || []);
const selectedTargets = useSelector(
  state => state.filters.selectedTarget || []
);
const selectedBuyers = useSelector(
  state => state.filters.selectedBuyer || []
);

    useAutoRefresh(() => {
      if (autoRefresh) setRefreshKey((prev) => prev + 1);
    }, [autoRefresh]);

    const handleApplyFilters = useCallback(
      (payload) => {
        updateFilters(payload);
        setFiltersVisible(false);
      },
      [updateFilters]
    );

    const toggleFilters = useCallback(() => {
      setFiltersVisible((v) => !v);
    }, []);

    const memoizedProps = useMemo(
      () => ({
        ...props,
        filters,
        refreshKey,
        onResetFilters: resetFilters,
      }),
      [props, filters, refreshKey, resetFilters]
    );

    return (
      <div className="container-fluid">
        <TopBar
          onToggleFilters={toggleFilters}
          autoRefresh={autoRefresh}
          setAutoRefresh={setAutoRefresh}
          rangeLabel={filters.datePreset}
          selectedCampaigns={selectedCampaigns}
          selectedPublishers={selectedPublishers}
          selectedTargets={selectedTargets}
          selectedBuyers={selectedBuyers}
        />

        {/* Wrapped page content */}
        <WrappedComponent {...memoizedProps} />

        {/* Filters panel */}
        <FiltersPanel
          visible={filtersVisible}
          onApply={handleApplyFilters}
          onClose={toggleFilters}
          initial={filters}
        />
      </div>
    );
  };

  ComponentWithFilters.displayName = `withPageFilters(${
    WrappedComponent.displayName || WrappedComponent.name || "Component"
  })`;

  return ComponentWithFilters;
};

export default withPageFilters;