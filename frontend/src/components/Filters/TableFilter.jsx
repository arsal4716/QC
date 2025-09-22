import React, { memo, useState, useRef, useEffect } from "react";
import DispositionFilter from "./DispositionFilters";
import ColumnSettingsModal from "../Table/ColumnSettingsModal";
import ExportProgressModal from "./ExportProgressModal";

const TableFilter = memo(({
  search,
  setSearch,
  onSearch,
  onExport,
  selectedDispositions = [],
  onDispositionChange,
  exportState,
  onExportProgressHide 
}) => {
  const [showDisposition, setShowDisposition] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const dispositionRef = useRef(null);

  const handleSearchClick = () => {
    onSearch?.();
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearchClick();
    }
  };
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dispositionRef.current && !dispositionRef.current.contains(event.target)) {
        setShowDisposition(false);
      }
    };

    if (showDisposition) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDisposition]);

  return (
    <div className="card-header d-flex align-items-center position-relative">
      {/* Search */}
      <div className="input-group me-2" style={{ maxWidth: 300 }}>
        <input
          className="form-control form-control-sm"
          placeholder="Search CID..."
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
        <div className="position-relative" ref={dispositionRef}>
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
            <div style={{ 
              position: 'absolute', 
              top: '100%', 
              right: 0, 
              zIndex: 1050,
              marginTop: '8px'
            }}>
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
            style={{ 
              backgroundColor: "#17233C", 
              color: "#fff",
              position: 'relative'
            }}
            data-bs-toggle="dropdown"
            aria-expanded="false"
            disabled={exportState?.isLoading} 
          >
            <i className="bi bi-download" /> 
            {exportState?.isLoading ? 'Exporting...' : 'Export'} 
            {exportState?.isLoading && (
              <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle">
                <span className="visually-hidden">Exporting</span>
              </span>
            )}
          </button>
          <ul className="dropdown-menu dropdown-menu-end">
            <li>
              <button 
                className="dropdown-item" 
                onClick={() => onExport("csv")}
                type="button"
                disabled={exportState?.isLoading} 
              >
                <i className="bi bi-filetype-csv me-2" /> CSV
              </button>
            </li>
            <li>
              <button
                className="dropdown-item"
                onClick={() => onExport("xlsx")}
                type="button"
                disabled={exportState?.isLoading} 
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
      
      <ExportProgressModal 
        show={exportState?.isLoading || exportState?.status === 'completed'} 
        state={exportState || {}}
        onHide={onExportProgressHide}
      />
    </div>
  );
});

TableFilter.displayName = "TableFilter";
export default TableFilter;