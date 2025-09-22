export const ExportProgressModal = ({ show, state, onHide }) => {
  if (!show) return null;

  return (
    <div
      className="position-fixed bottom-0 end-0 m-3 shadow-lg rounded text-white"
      style={{
        width: "300px",
        backgroundColor: "#17233D",
        zIndex: 2000,
      }}
    >
      <div className="p-3">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="mb-0">
            {state.status === "completed"
              ? "Export Complete"
              : state.status === "error"
              ? "Export Failed"
              : "Exporting Records"}
          </h6>
          <button
            type="button"
            className="btn-close btn-close-white btn-sm"
            aria-label="Close"
            onClick={onHide}
          />
        </div>

        {/* Processing */}
        {state.status === "processing" && (
          <>
            <div
              className="spinner-border text-light mb-2"
              role="status"
              style={{ width: "1.5rem", height: "1.5rem" }}
            >
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mb-1 small">Processing... {state.progress}%</p>
            <div className="progress" style={{ height: "6px" }}>
              <div
                className="progress-bar progress-bar-striped progress-bar-animated bg-info"
                style={{ width: `${state.progress}%` }}
              />
            </div>
          </>
        )}
        {state.status === "completed" && (
          <>
            <i
              className="bi bi-check-circle-fill text-success"
              style={{ fontSize: "2rem" }}
            />
            <p className="mt-2 mb-0 small">Export completed successfully!</p>
            <p className="text-muted small mb-0">
              Download should start automatically.
            </p>
          </>
        )}
        {state.status === "error" && (
          <>
            <i
              className="bi bi-x-circle-fill text-danger"
              style={{ fontSize: "2rem" }}
            />
            <p className="mt-2 mb-0 small">Export failed</p>
            <p className="text-danger small mb-0">{state.error}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default ExportProgressModal;
