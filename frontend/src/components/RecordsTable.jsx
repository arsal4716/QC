import React, { useEffect, useState, useContext, useCallback } from "react";
import { ColumnsContext } from "../contexts/ColumnsContext";
import ColumnSettingsModal from "./ColumnSettingsModal";
import DetailModal from "./DetailModal";
import { toast } from "react-toastify";
import { getRecords, getCallDetail, exportRecords } from "../api/callsApi";
import {formatRingbaDate} from '../utils/dateFormatter'
export default function RecordsTable({
  filters,
  refreshKey,
  selectedCampaigns = [],
  selectedPublishers = [],
}) {
  const context = useContext(ColumnsContext);
  const columns = context?.columns ?? [];
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({
    total: 0,
    pages: 1,
    page: 1,
    limit: 25
  });
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [sortBy, setSortBy] = useState("callTimestamp");
  const [sortDir, setSortDir] = useState("desc");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [detail, setDetail] = useState(null);

  const fetchData = useCallback(
    async (pageNumber = page) => {
      setLoading(true);
      try {
        const params = {
          page: pageNumber,
          limit,
          sortBy,
          sortDir,
          ...filters,
          campaign: selectedCampaigns.join(","),
          publisher: selectedPublishers.join(","),
        };
        
        if (search.trim()) {
          params.search = search.trim();
        }

        const response = await getRecords(params);
        
        // Response should now have data and meta properties
        const records = response.data || [];
        const responseMeta = response.meta || {
          total: records.length,
          pages: 1,
          page: pageNumber,
          limit: limit,
        };

        const normalized = records.map((r) => ({ ...r, id: r._id || r.id }));
        setRows(normalized);
        setMeta(responseMeta);
        setPage(responseMeta.page || pageNumber);
      } catch (error) {
        console.error("Failed to load records:", error);
        toast.error("Failed to load records");
        setRows([]);
        setMeta({
          total: 0,
          pages: 1,
          page: 1,
          limit: limit,
        });
      } finally {
        setLoading(false);
      }
    },
    [page, limit, sortBy, sortDir, filters, search, selectedCampaigns, selectedPublishers]
  );

  // Reset to page 1 when filters, sort, or search changes
  useEffect(() => {
    setPage(1);
    fetchData(1);
  }, [filters, refreshKey, sortBy, sortDir, search]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.trim() !== "") {
        setPage(1);
        fetchData(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [search, fetchData]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > meta.pages) return;
    setPage(newPage);
    fetchData(newPage);
  };

  async function openDetail(id, field = null) {
    try {
      const detail = await getCallDetail(id);
      setDetail({ data: detail, field });
    } catch {
      toast.error("Failed to load detail");
    }
  }

  async function onExport(fmt = "csv") {
    try {
      const blob = await exportRecords(filters, fmt);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `records.${fmt}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Exported as ${fmt.toUpperCase()}`);
    } catch (e) {
      console.error("Export failed:", e);
      toast.error("Export failed");
    }
  }

  if (!context) {
    return <div className="text-danger">Columns not provided</div>;
  }

  return (
    <div className="card" style={{ backgroundColor: "#17233d", fontSize: "12px" }}>
      <div className="card-header d-flex align-items-center">
        <div className="input-group me-2" style={{ maxWidth: 300 }}>
          <input
            className="form-control form-control-sm"
            placeholder="Search caller, campaign..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ backgroundColor: "#ffffff", color: "#000" }}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                setPage(1);
                fetchData(1);
              }
            }}
          />
          <button
            className="btn btn-sm btn-primary"
            onClick={() => {
              setPage(1);
              fetchData(1);
            }}
          >
            <i className="bi bi-search" />
          </button>
        </div>
        <div className="ms-auto d-flex gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary dropdown-toggle"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <i className="bi bi-download" /> Export
          </button>
          <ul className="dropdown-menu dropdown-menu-end">
            <li>
              <button className="dropdown-item" onClick={() => onExport("csv")}>
                <i className="bi bi-filetype-csv me-2" /> CSV
              </button>
            </li>
            <li>
              <button
                className="dropdown-item"
                onClick={() => onExport("xlsx")}
              >
                <i className="bi bi-file-earmark-spreadsheet me-2" /> XLSX
              </button>
            </li>
          </ul>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setShowSettings(true)}
          >
            <i className="bi bi-gear" /> Sort
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-hover mb-0 text-light">
          <thead style={{ backgroundColor: "#17233d" }}>
            <tr>
              {columns
                .filter((c) => c.visible)
                .map((col) => (
                  <th
                    key={col.key}
                    className="text-white"
                    style={{ minWidth: 120, backgroundColor: "#17233d" }}
                  >
                    {col.label}
                    <button
                      className="btn btn-sm btn-link text-light ms-2"
                      onClick={() => {
                        const newSortDir = sortBy === col.key && sortDir === "desc" ? "asc" : "desc";
                        setSortBy(col.key);
                        setSortDir(newSortDir);
                        setPage(1);
                      }}
                    >
                      <i className={`bi bi-arrow-${sortBy === col.key && sortDir === "asc" ? "up" : "down"}`} />
                    </button>
                  </th>
                ))}
              <th className="text-white" style={{ backgroundColor: "#17233d" }}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={(columns?.length ?? 0) + 1} className="text-center text-white">
                  <div className="spinner-border spinner-border-sm me-2" role="status" />
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={(columns?.length ?? 0) + 1} className="text-center text-white">
                  No records found
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r._id || r.id}>
                  {columns
                    .filter((c) => c.visible)
                    .map((col) => (
                      <td
                        key={col.key}
                        className="text-white"
                        style={{
                          backgroundColor: "#17233d",
                          maxWidth: 180,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          cursor: "pointer",
                        }}
                        onClick={() => openDetail(r._id || r.id, col.key)}
                        title={getByPath(r, col.key)}
                      >
                        {renderCell(r, col)}
                      </td>
                    ))}
                  <td style={{ backgroundColor: "#17233d" }}>
                    <div className="dropdown">
                      <button
                        className="btn btn-sm btn-secondary dropdown-toggle"
                        data-bs-toggle="dropdown"
                      >
                        ...
                      </button>
                      <ul className="dropdown-menu dropdown-menu-end">
                        <li>
                          <button
                            className="dropdown-item"
                            onClick={() => openDetail(r._id || r.id, null)}
                          >
                            View Details
                          </button>
                        </li>
                        <li>
                          <button
                            className="dropdown-item"
                            onClick={() => navigator.clipboard.writeText(JSON.stringify(r, null, 2))}
                          >
                            Copy JSON
                          </button>
                        </li>
                      </ul>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer with Pagination */}
      <div className="card-footer d-flex align-items-center justify-content-between">
        <div className="text-white">
          Showing {rows.length} of {meta.total} records
          {meta.pages > 1 && ` (Page ${page} of ${meta.pages})`}
        </div>
        
        {meta.pages > 1 && (
          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-sm btn-outline-light"
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
            >
              ← Prev
            </button>
            
            <span className="text-white mx-2">
              {page} / {meta.pages}
            </span>
            
            <button
              className="btn btn-sm btn-outline-light"
              disabled={page >= meta.pages}
              onClick={() => handlePageChange(page + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      <ColumnSettingsModal
        show={showSettings}
        onClose={() => setShowSettings(false)}
      />
      <DetailModal detail={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

function renderCell(r, col) {
  const val = getByPath(r, col.key);
  if (val === null || val === undefined || val === "") return "-";

  if (col.key === "recordingUrl") {
    return (
      <a href={val} target="_blank" rel="noreferrer" className="text-info">
        <i className="bi bi-play-circle me-1" /> Play
      </a>
    );
  }
  if (col.key === "callTimestamp") {
    return formatRingbaDate(val);
  }

  if (typeof val === 'object') {
    return JSON.stringify(val);
  }

  let str = String(val).trim();
  
  if (["qc.reason", "qc.summary", "transcript"].includes(col.key)) {
    const words = str.split(/\s+/);
    if (words.length > 3) {
      return words.slice(0, 3).join(" ") + "…";
    }
  }

  return str;
}

function getByPath(obj, path) {
  return path.split('.').reduce((acc, part) => {
    if (acc === null || acc === undefined) return null;
    return acc[part];
  }, obj);
}