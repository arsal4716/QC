import React, { useState } from "react";
import DispositionFilter from "./DispositionFilters";

const FilterBar = ({
  filters = {},
  onFilterChange = () => {}
}) => {
  const [showDispositionFilter, setShowDispositionFilter] = useState(false);

  const safeFilters = {
    disposition: filters?.disposition || [],
  };

  const handleDispositionChange = (dispositions) => {
    onFilterChange({ ...filters, disposition: dispositions });
  };

  const removeFilter = (valueToRemove) => {
    const newValues = safeFilters.disposition.filter((v) => v !== valueToRemove);
    onFilterChange({ ...filters, disposition: newValues });
  };

  return (
    <div className="d-flex flex-wrap align-items-center p-3 gap-2">
      <div className="dropdown">
        <button
          className="btn btn-outline-light dropdown-toggle d-flex align-items-center"
          onClick={() => setShowDispositionFilter(!showDispositionFilter)}
        >
          <i className="bi bi-funnel me-1" /> Disposition
          {safeFilters.disposition.length > 0 && (
            <span className="badge bg-primary ms-1">
              {safeFilters.disposition.length}
            </span>
          )}
        </button>
        {showDispositionFilter && (
          <div className="position-absolute mt-1" style={{ zIndex: 1000 }}>
            <DispositionFilter
              value={safeFilters.disposition}
              onChange={handleDispositionChange}
              onClose={() => setShowDispositionFilter(false)}
            />
          </div>
        )}
      </div>

      {/* Active filter badges */}
      <div className="d-flex flex-wrap gap-1 ms-auto">
        {safeFilters.disposition.map((disp) => (
          <span
            key={disp}
            className="badge bg-primary d-flex align-items-center"
          >
            {disp}
            <button
              type="button"
              className="btn-close btn-close-white ms-1"
              style={{ fontSize: "8px" }}
              onClick={() => removeFilter(disp)}
            />
          </span>
        ))}
      </div>
    </div>
  );
};

export default FilterBar;
