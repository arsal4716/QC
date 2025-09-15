import { formatRingbaDate } from "./dateFormatter";

export const getByPath = (obj, path) => {
  if (!obj || !path) return undefined;
  try {
    return path.split(".").reduce((acc, part) => {
      if (acc == null) return undefined;
      return acc[part];
    }, obj);
  } catch (e) {
    return undefined;
  }
};

export const renderCell = (record, column) => {
  if (!record || !column) return "-";

  const key = typeof column === "string" ? column : column.key;
  if (!key) return "-";

  const value = getByPath(record, key);

  if (value === undefined || value === null || value === "") return "-";

  if (key === "recordingUrl") {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="text-info"
        onClick={(e) => e.stopPropagation()}
      >
        <i className="bi bi-play-circle me-1" /> Play
      </a>
    );
  }

  if (key === "callTimestamp") return formatRingbaDate(value);

  if (typeof value === "object" && value !== null) {
    try {
      return JSON.stringify(value);
    } catch {
      return "[Object]";
    }
  }
 
  const str = String(value).trim();
  return column.truncate && str.length > 20 ? str.slice(0, 20) + "..." : str;
};
export const renderField = (label, value, type = 'text') => {
  if (type === 'date') value = formatRingbaDate(value);
  return (
    <div className="detail-field mb-2">
      <label style={{ fontWeight: 'bold' }}>{label}:</label>
      <span>{value || '-'}</span>
    </div>
  );
};


export const exportRecordForCSV = (record, columns) => {
  const row = {};
  (columns || []).forEach((col) => {
    const val = getByPath(record, col.key);
    row[col.label || col.key] = val == null ? "" : String(val);
  });
  return row;
};
