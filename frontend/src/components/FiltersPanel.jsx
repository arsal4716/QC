import React, { useState, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import { setFilters } from "../store/slices/filtersSlice";
import { DateTime } from "luxon";

const DATE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_2_days", label: "Last 2 Days" },
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "this_week", label: "This Week" },
  { value: "last_week", label: "Last Week" },
  { value: "last_30_days", label: "Last 30 Days" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "last_6_months", label: "Last 6 Months" },
  { value: "this_year", label: "This Year" },
  { value: "custom", label: "Custom Range" },
];

const FiltersPanel = React.memo(
  ({
    visible,
    onApply,
    onClose,
    initial,
    selectedCampaigns,
    setSelectedCampaigns,
    selectedPublishers,
    setSelectedPublishers,
    selectedTargets,
    setSelectedTargets,
    selectedBuyers,
    setSelectedBuyers,
  }) => {
    const dispatch = useDispatch();
    const [preset, setPreset] = useState(initial?.preset || "today");
    const [dateRange, setDateRange] = useState({
      startDate: initial?.startDate || "",
      endDate: initial?.endDate || "",
    });

    const handleApply = useCallback(() => {
      let startET = null;
      let endET = null;

      if (preset === "custom" && dateRange.startDate && dateRange.endDate) {
        // Convert datetime-local (browser) to ET ISO string
        startET = DateTime.fromISO(dateRange.startDate, {
          zone: "America/New_York",
        }).toISO();
        endET = DateTime.fromISO(dateRange.endDate, {
          zone: "America/New_York",
        }).toISO();
      }

      const payload = {
        datePreset: preset,
        campaign: selectedCampaigns,
        publisher: selectedPublishers,
        target: selectedTargets,
        buyer: selectedBuyers,
        startDate: startET,
        endDate: endET,
      };

      dispatch(setFilters(payload));
      onApply(payload);
      toast.success("Filters applied");
    }, [
      preset,
      selectedCampaigns,
      selectedPublishers,
      selectedTargets,
      selectedBuyers,
      dateRange,
      dispatch,
      onApply,
    ]);

    const handleReset = useCallback(() => {
      setSelectedCampaigns([]);
      setSelectedPublishers([]);
      setSelectedTargets([]);
      setSelectedBuyers([]);
      setPreset("today");
      setDateRange({ startDate: "", endDate: "" });
      toast.info("Filters reset");
    }, [
      setSelectedCampaigns,
      setSelectedPublishers,
      setSelectedTargets,
      setSelectedBuyers,
    ]);

    const handlePresetChange = useCallback((e) => {
      setPreset(e.target.value);
    }, []);

    const handleDateChange = useCallback((field, value) => {
      setDateRange((prev) => ({ ...prev, [field]: value }));
    }, []);

    const datePresetsOptions = useMemo(
      () =>
        DATE_PRESETS.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        )),
      []
    );

    if (!visible) return null;

    return (
      <div
        className="filters-panel card position-fixed end-0 top-0 m-4 p-3 shadow"
        style={{
          width: 420,
          zIndex: 1050,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div className="d-flex mb-3 align-items-center">
          <h5 className="mb-0">Filters</h5>
          <button
            className="btn btn-sm btn-outline-secondary ms-auto"
            onClick={onClose}
            aria-label="Close filters"
          >
            Close
          </button>
        </div>

        <div className="mb-3">
          <label className="form-label">Date Preset</label>
          <select
            className="form-select"
            value={preset}
            onChange={handlePresetChange}
          >
            {datePresetsOptions}
          </select>
        </div>

        {preset === "custom" && (
          <div className="mb-3">
            <label className="form-label">Start Date</label>
            <input
              className="form-control"
              type="datetime-local"
              value={dateRange.startDate}
              onChange={(e) => handleDateChange("startDate", e.target.value)}
            />
            <label className="form-label mt-2">End Date</label>
            <input
              className="form-control"
              type="datetime-local"
              value={dateRange.endDate}
              onChange={(e) => handleDateChange("endDate", e.target.value)}
            />
          </div>
        )}

        <div className="d-flex gap-2">
          <button className="btn btn-primary flex-fill" onClick={handleApply}>
            <i className="bi bi-filter" /> Apply
          </button>
          <button
            className="btn btn-outline-secondary flex-fill"
            onClick={handleReset}
          >
            Reset
          </button>
        </div>
      </div>
    );
  }
);

FiltersPanel.displayName = "FiltersPanel";

export default FiltersPanel;
