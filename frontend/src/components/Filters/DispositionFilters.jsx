import React from "react";

const DispositionFilter = ({ value = [], onChange, onClose }) => {
  const dispositionOptions = [
    { value: "Sales", label: "Sales", color: "success" },
    { value: "Not Interested", label: "Not Interested", color: "warning" },
    { value: "Not Qualified", label: "Not Qualified", color: "warning" },
    { value: "DNC", label: "DNC", color: "danger" },
    { value: "DNC (Do Not Call)", label: "DNC (Do Not Call)", color: "danger" },
    { value: "Voicemail", label: "Voicemail", color: "info" },
    { value: "Tech Issues", label: "Tech Issues", color: "secondary" },
    { value: "DWSPI", label: "DWSPI", color: "secondary" },
    { value: "Unresponsive", label: "Unresponsive", color: "secondary" },
    { value: "Target hung up", label: "Hungup", color: "secondary" },
    { value: "Callback", label: "Callback", color: "primary" },
    { value: "IVR", label: "IVR", color: "info" },
    { value: "subsidy/incentivised", label: "Subsidy", color: "info" },
    { value: "Language Barrier", label: "Language Barrier", color: "secondary" },
    { value: "Misdialed", label: "Misdialed", color: "secondary" },
    { value: "income", label: "Income", color: "secondary" },
  ];

  const toggleDisposition = (disposition) => {
    const newValue = value.includes(disposition)
      ? value.filter((d) => d !== disposition)
      : [...value, disposition];
    onChange(newValue);
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div
      style={{
        width: "300px",
        backgroundColor: "#1e2a47",
        border: "1px solid #2d3b5a",
        borderRadius: "8px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
        maxHeight: "400px",
        display: "flex",
        flexDirection: "column",
        position: "absolute",
        top: "100%",
        right: "0",
        zIndex: 1060, // Higher z-index
        marginTop: "8px",
      }}
    >
      {/* Header */}
      <div className="p-3 pb-2 border-bottom border-secondary">
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="text-light mb-0" style={{ fontSize: "14px", fontWeight: "600" }}>
            Filter by Disposition
          </h6>
          <button
            type="button"
            className="btn-close btn-close-white"
            onClick={onClose}
            aria-label="Close"
            style={{ fontSize: "10px" }}
          />
        </div>
      </div>

      {/* Scrollable Content */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0 16px",
          maxHeight: "280px",
        }}
        className="custom-scrollbar"
      >
        {dispositionOptions.map((option) => (
          <div key={option.value} className="py-2">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                checked={value.includes(option.value)}
                onChange={() => toggleDisposition(option.value)}
                id={`disposition-${option.value}`}
                style={{
                  cursor: "pointer",
                  backgroundColor: value.includes(option.value) ? "#0d6efd" : "",
                  borderColor: value.includes(option.value) ? "#0d6efd" : "#6c757d"
                }}
              />
              <label
                className="form-check-label text-light d-flex align-items-center"
                htmlFor={`disposition-${option.value}`}
                style={{
                  fontSize: "13px",
                  cursor: "pointer",
                  lineHeight: "1.3",
                  paddingLeft: "8px",
                  width: "100%"
                }}
              >
                <span
                  className={`badge bg-${option.color} me-2`}
                  style={{
                    width: "10px",
                    height: "10px",
                    padding: "0",
                    borderRadius: "50%",
                    flexShrink: 0
                  }}
                ></span>
                {option.label}
              </label>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-3 pt-2 border-top border-secondary">
        <button
          className="btn btn-sm w-100"
          onClick={clearAll}
          style={{
            fontSize: "12px",
            backgroundColor: value.length > 0 ? "#ffc107" : "#6c757d",
            color: value.length > 0 ? "#000" : "#fff",
            border: "none",
            opacity: value.length > 0 ? 1 : 0.6
          }}
          disabled={value.length === 0}
        >
          <i className={`bi bi-${value.length > 0 ? "x-circle" : "circle"} me-1`} />
          Clear All {value.length > 0 ? `(${value.length})` : ""}
        </button>
      </div>
    </div>
  );
};
const scrollbarStyles = `
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: #1a243a;
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #495057;
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #6c757d;
}
`;

if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = scrollbarStyles;
  document.head.appendChild(styleSheet);
}

export default DispositionFilter;