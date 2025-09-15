import React, { memo, useState } from "react";
import DispositionFilter from "./DispositionFilters";
import ColumnSettingsModal from "../Table/ColumnSettingsModal";

const TableFilter = memo(({
  search,
  setSearch,
  onSearch,
  onExport,
  selectedDispositions = [],
  onDispositionChange,
}) => {
  const [showDisposition, setShowDisposition] = useState(false);
  const [showColumns, setShowColumns] = useState(false);

  const handleSearchClick = () => {
    onSearch?.();
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearchClick();
    }
  };

  return (
    <div className="card-header d-flex align-items-center">
      {/* Search */}
      <div className="input-group me-2" style={{ maxWidth: 300 }}>
        <input
          className="form-control form-control-sm"
          placeholder="Search caller, campaign..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ backgroundColor: "#ffffff", color: "#000" }}
          onKeyPress={handleKeyPress}
        />
        <button 
          className="btn btn-sm btn-primary" 
          onClick={handleSearchClick}
          type="button"
        >
          <i className="bi bi-search" />
        </button>
      </div>
      
      <div className="ms-auto d-flex gap-2">
        <div className="position-relative">
          <button
            className="btn btn-sm btn-outline-info"
            onClick={() => setShowDisposition((prev) => !prev)}
            type="button"
          >
            <i className="bi bi-funnel" /> Dispositions
            {selectedDispositions.length > 0 && (
              <span className="badge bg-warning text-dark ms-1">
                {selectedDispositions.length}
              </span>
            )}
          </button>

          {showDisposition && (
            <div className="position-absolute end-0 mt-2" style={{ zIndex: 1000 }}>
              <DispositionFilter
                value={selectedDispositions}
                onChange={onDispositionChange}
                onClose={() => setShowDisposition(false)}
              />
            </div>
          )}
        </div>

        <div className="dropdown">
          <button
            type="button"
            className="btn btn-sm dropdown-toggle"
            style={{ backgroundColor: "#17233C", color: "#fff" }}
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <i className="bi bi-download" /> Export
          </button>
          <ul className="dropdown-menu dropdown-menu-end">
            <li>
              <button 
                className="dropdown-item" 
                onClick={() => onExport("csv")}
                type="button"
              >
                <i className="bi bi-filetype-csv me-2" /> CSV
              </button>
            </li>
            <li>
              <button
                className="dropdown-item"
                onClick={() => onExport("xlsx")}
                type="button"
              >
                <i className="bi bi-file-earmark-spreadsheet me-2" /> XLSX
              </button>
            </li>
          </ul>
        </div>
        <button
          className="btn btn-sm btn-outline-success"
          onClick={() => setShowColumns(true)}
          type="button"
        >
          <i className="bi bi-gear text-white" /> Columns
        </button>
      </div>

      {showColumns && (
        <ColumnSettingsModal
          show={showColumns}
          onClose={() => setShowColumns(false)}
        />
      )}
    </div>
  );
});

TableFilter.displayName = "TableFilter";
export default TableFilter;