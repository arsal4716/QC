const DispositionFilter = ({ value = [], onChange, onClose }) => {
  const dispositionOptions = [
    { value: 'Sales', label: 'Sales', color: 'success' },
    { value: 'Not Interested', label: 'Not Interested', color: 'warning' },
    { value: 'Not Qualified', label: 'Not Qualified', color: 'warning' },
    { value: 'DNC', label: 'DNC', color: 'danger' },
    { value: 'Voicemail', label: 'Voicemail', color: 'info' },
    { value: 'Tech Issues', label: 'Tech Issues', color: 'secondary' },
    { value: 'DWSPI', label: 'DWSPI', color: 'secondary' },
    { value: 'Unresponsive', label: 'Unresponsive', color: 'secondary' },
    { value: 'Hungup', label: 'Hungup', color: 'secondary' },
    { value: 'Callback', label: 'Callback', color: 'primary' },
    { value: 'IVR', label: 'IVR', color: 'info' },
    { value: 'Subsidy', label: 'Subsidy', color: 'info' },
    { value: 'Language Barrier', label: 'Language Barrier', color: 'secondary' },
    { value: 'Misdialed', label: 'Misdialed', color: 'secondary' }
  ];

  const toggleDisposition = (disposition) => {
    const newValue = value.includes(disposition)
      ? value.filter(d => d !== disposition)
      : [...value, disposition];
    onChange(newValue);
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className="p-3" style={{ width: '280px', backgroundColor: '#1e2a47', border: '1px solid #495057', borderRadius: '4px' }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="text-light mb-0">Disposition Filter</h6>
        <button
          type="button"
          className="btn-close btn-close-white"
          onClick={onClose}
          aria-label="Close"
        />
      </div>

      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {dispositionOptions.map((option) => (
          <div key={option.value} className="form-check mb-2">
            <input
              className="form-check-input"
              type="checkbox"
              checked={value.includes(option.value)}
              onChange={() => toggleDisposition(option.value)}
              id={`disposition-${option.value}`}
            />
            <label
              className="form-check-label text-light d-flex align-items-center"
              htmlFor={`disposition-${option.value}`}
              style={{ fontSize: '12px', cursor: 'pointer' }}
            >
              <span className={`badge bg-${option.color} me-2`} style={{ width: '8px', height: '8px', padding: '0' }}></span>
              {option.label}
            </label>
          </div>
        ))}
      </div>

      {value.length > 0 && (
        <div className="mt-3 pt-2 border-top border-secondary">
          <button
            className="btn btn-sm btn-outline-warning w-100"
            onClick={clearAll}
          >
            <i className="bi bi-x-circle me-1" />
            Clear All ({value.length})
          </button>
        </div>
      )}
    </div>
  );
};

export default DispositionFilter;