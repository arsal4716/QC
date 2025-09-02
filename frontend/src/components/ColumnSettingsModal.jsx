import React, { useContext, useState, useEffect } from 'react';
import { ColumnsContext } from '../contexts/ColumnsContext';

export default function ColumnSettingsModal({ show, onClose }) {
  const { columns, setColumns } = useContext(ColumnsContext);
  const [local, setLocal] = useState(columns);

  useEffect(() => {
    if (show) setLocal(columns);
  }, [show, columns]);

  function toggle(idx) {
    const updated = [...local];
    updated[idx].visible = !updated[idx].visible;
    setLocal(updated);
  }

  function save() {
    setColumns(local);
    onClose();
  }

  return (
    <>
      {/* Modal */}
      <div
        className={`modal fade ${show ? "show d-block" : ""}`}
        tabIndex="-1"
        role="dialog"
        style={{ backgroundColor: show ? "rgba(0,0,0,0.5)" : "transparent" }}
      >
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Column Settings</h5>
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={onClose}
              ></button>
            </div>

            <div className="modal-body">
              {local.map((c, i) => (
                <div className="form-check" key={c.key}>
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={c.key}
                    checked={c.visible}
                    onChange={() => toggle(i)}
                  />
                  <label className="form-check-label" htmlFor={c.key}>
                    {c.label}
                  </label>
                </div>
              ))}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={save}>
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
