import React, { memo, useMemo } from "react";
import TableRow from "./TableRow";
import Pagination from "./Pagination";
import LoadingState from "../LoadingState";
import EmptyState from "../EmptyState";

const normalizeColumns = (cols) => {
  if (Array.isArray(cols)) return cols.filter(Boolean);
  if (cols && typeof cols === "object" && !Array.isArray(cols)) {
    return Object.values(cols).filter(Boolean);
  }
  return [];
};

const VirtualizedTable = memo(({
  data,
  columns,
  loading,
  totalCount,
  pagination,
  onRowClick,
  onSort,
  onPageChange,
  sortBy,
  sortDir,
}) => {
  const safeData = useMemo(() => Array.isArray(data) ? data.filter(Boolean) : [], [data]);
  const safeColumns = useMemo(() => normalizeColumns(columns), [columns]);

  if (loading) return <LoadingState />;
  if (!loading && safeData.length === 0) {
    return <EmptyState message="No records found." />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "600px" }}>
      <div style={{ 
        flex: "1", 
        overflowY: "hidden", 
        borderRadius: "5px",
        backgroundColor: "#17233d",
      }}>
        <table style={{ 
          tableLayout: "fixed", 
          width: "100%", 
          backgroundColor: "#17233d", 
          color: "white",
          borderCollapse: "collapse"
        }}>
          <thead style={{ 
            backgroundColor: "#17233d", 
            color: "white", 
            fontSize: "10px",
          }}>
            <tr>
              {safeColumns.map((col, idx) => col && col.visible ? (
                <th
                  key={col.key || idx}
                  style={{
                    width: col.width || "auto",
                    minWidth: col.width ? parseInt(col.width) : 100,
                    padding: "6px 12px",
                    textAlign: "left",
                    borderLeft: "none",
                    borderRight: "none",
                    cursor: col.sortable ? "pointer" : "default",
                    fontWeight: "normal",
                  }}
                  onClick={() => col.sortable && onSort?.(
                    col.key, 
                    sortBy === col.key && sortDir === "asc" ? "desc" : "asc"
                  )}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <span>{col.label || col.key}</span>
                    {col.sortable && sortBy === col.key && (
                      <span style={{ fontSize: "12px" }}>
                        {sortDir === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
              ) : null)}
              <th style={{ 
                width: "100px", 
                borderLeft: "none", 
                borderRight: "none",
                padding: "6px 12px",
              }}>
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {safeData.map((record, idx) => (
              <TableRow
                key={record.id || idx}
                record={record}
                columns={safeColumns}
                onRowClick={onRowClick}
              />
            ))}
          </tbody>
        </table>
      </div>
      {pagination && totalCount > 0 && (
        <div style={{ 
          marginTop: "16px", 
          padding: "12px",
          backgroundColor: "#17233d",
          borderRadius: "5px"
        }}>
          <Pagination
            currentPage={pagination?.page ?? 1}
            totalPages={pagination?.pages ?? 1}
            pageSize={pagination?.limit ?? 25}
            totalCount={totalCount ?? 0}
            onPageChange={onPageChange}
            loading={loading}
          />
        </div>
      )}
    </div>
  );
});

VirtualizedTable.displayName = "VirtualizedTable";
export default VirtualizedTable;