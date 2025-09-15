import React, { memo, useCallback } from "react";
import { renderCell, getByPath } from "../../utils/tableUtils";
import StatusBadge from "./StatusBadge";
import { useDispatch } from "react-redux";
import { setRecordDetail } from "../../store/slices/modalSlice";
import { toast } from "react-toastify";

const TableRow = memo(({ record, columns, onRowClick }) => {
  const dispatch = useDispatch();
  const safeColumns = Array.isArray(columns) ? columns.filter(Boolean) : [];
  const safeRecord = record && typeof record === "object" ? record : {};
  
  console.log("safe records", safeRecord);

const handleViewDetails = useCallback((e) => {
  e.stopPropagation();
  dispatch(setRecordDetail(safeRecord));
}, [dispatch, safeRecord]);

  const handleCopy = useCallback((e) => {
    e.stopPropagation();
    const copyData = safeColumns.reduce((acc, col) => {
      if (col && col.visible) {
        acc[col.label || col.key] = getByPath(safeRecord, col.key) || "-";
      }
      return acc;
    }, {});
    
    navigator.clipboard.writeText(JSON.stringify(copyData, null, 2));
    toast.success("Row copied!");
  }, [safeColumns, safeRecord]);

  return (
    <tr
      onClick={() => onRowClick?.(safeRecord)}
      style={{
        cursor: onRowClick ? "pointer" : "default",
        borderBottom: "1px solid #525151ff",
        color: "white",
        fontSize: "12px",
        backgroundColor: "#17233d",
      }}
    >
      {safeColumns.map((col, idx) => {
        if (!col || !col.visible) return null;

        const key = col.key;
        const rawValue = key ? getByPath(safeRecord, key) : "-";
        const cellContent = key === "status" ? (
          <StatusBadge status={rawValue} />
        ) : (
          renderCell(safeRecord, col) || rawValue
        );

        return (
          <td
            key={key || idx}
            style={{
              width: col.width || "auto",
              minWidth: col.width ? parseInt(col.width) : 100,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              padding: "6px 12px",
              borderLeft: "none",
              borderRight: "none",
            }}
            title={rawValue !== null && rawValue !== undefined ? String(rawValue) : "-"}
          >
            {cellContent}
          </td>
        );
      })}

      <td
        style={{
          width: "100px",
          textAlign: "center",
          borderLeft: "none",
          borderRight: "none",
        }}
      >
        <div className="d-flex gap-2 justify-content-center">
          <button
            className="btn btn-outline-success btn-sm p-1"
            onClick={handleViewDetails}
            title="View Details"
            style={{
              width: "24px",
              height: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <i className="bi bi-eye" style={{ color: "white", fontSize: "12px" }}></i>
          </button>

          <button
            className="btn btn-outline-info btn-sm p-1"
            onClick={handleCopy}
            title="Copy JSON"
            style={{
              width: "24px",
              height: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <i className="bi bi-clipboard" style={{ color: "white", fontSize: "12px" }}></i>
          </button>
        </div>
      </td>
    </tr>
  );
});

TableRow.displayName = "TableRow";
export default TableRow;