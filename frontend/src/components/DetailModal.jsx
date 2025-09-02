import React, { useContext } from "react";
import { ColumnsContext } from "../contexts/ColumnsContext";

export default function DetailModal({ detail, onClose }) {
  const { columns } = useContext(ColumnsContext);
  if (!detail) return null;

  const { data, field } = detail;

  const visibleColumns = columns.filter((c) => c.visible);

  return (
    <div
      className="modal-backdrop-custom"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        zIndex: 1040,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div className="modal d-block" tabIndex="-1" style={{ zIndex: 1050 }}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Record Detail</h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
              ></button>
            </div>

            <div className="modal-body">
              {field ? (
                <div>
                  <h6>{field}</h6>
                  <pre
                    style={{
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      maxHeight: "400px",
                      overflowY: "auto",
                    }}
                  >
                    {getByPath(data, field) ?? "-"}
                  </pre>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() =>
                      navigator.clipboard.writeText(
                        String(getByPath(data, field) ?? "")
                      )
                    }
                  >
                    Copy
                  </button>
                </div>
              ) : (
                <table className="table table-sm">
                  <tbody>
                    {visibleColumns.map((col) => (
                      <tr key={col.key}>
                        <th>{col.label}</th>
                        <td>{getByPath(data, col.key) ?? "-"}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() =>
                              navigator.clipboard.writeText(
                                String(getByPath(data, col.key) ?? "")
                              )
                            }
                          >
                            Copy
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
function getByPath(obj, path) {
  return path
    .split(".")
    .reduce((acc, p) => (acc && acc[p] !== undefined ? acc[p] : null), obj);
}
