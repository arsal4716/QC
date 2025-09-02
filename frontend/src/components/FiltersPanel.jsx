import React from "react";
import { toast } from "react-toastify";
import { useState } from "react";
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
  { value: "custom", label: "Custom Range" }
];

const FiltersPanel = ({
  visible,
  onApply,
  onClose,
  initial,
  selectedCampaigns,
  setSelectedCampaigns,
  selectedPublishers,
  setSelectedPublishers,
}) => {
  const [preset, setPreset] = useState(initial?.preset || "today");
  const [callerId, setCallerId] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });

  const handleApply = () => {
    const payload = {
      datePreset: preset,
      campaign: selectedCampaigns.join(","),
      publisher: selectedPublishers.join(","),
      callerId: callerId || undefined,
      startDate: dateRange.startDate || undefined,
      endDate: dateRange.endDate || undefined,
    };
    
    onApply(payload);
    toast.success("Filters applied");
  };

  const handleReset = () => {
    setSelectedCampaigns([]);
    setSelectedPublishers([]);
    setCallerId("");
    setPreset("today");
    setDateRange({ startDate: "", endDate: "" });
    toast.info("Filters reset");
  };

  if (!visible) return null;

  return (
    <div
      className="filters-panel card position-absolute end-0 top-0 m-4 p-3 shadow"
      style={{ width: 420, zIndex: 1050 }}
    >
      <div className="d-flex mb-3 align-items-center">
        <h5 className="mb-0">Filters</h5>
        <button
          className="btn btn-sm btn-outline-secondary ms-auto"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <div className="mb-3">
        <label className="form-label">Date Preset</label>
        <select
          className="form-select"
          value={preset}
          onChange={(e) => setPreset(e.target.value)}
        >
          {DATE_PRESETS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {preset === "custom" && (
        <div className="mb-3">
          <label className="form-label">Start Date</label>
          <input
            className="form-control"
            type="datetime-local"
            value={dateRange.startDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
          />
          <label className="form-label mt-2">End Date</label>
          <input
            className="form-control"
            type="datetime-local"
            value={dateRange.endDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
          />
        </div>
      )}
      <div className="d-flex gap-2">
        <button className="btn btn-primary" onClick={handleApply}>
          <i className="bi bi-filter" /> Apply
        </button>
        <button className="btn btn-outline-secondary" onClick={handleReset}>
          Reset
        </button>
      </div>
    </div>
  );
};

export default React.memo(FiltersPanel);