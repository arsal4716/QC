import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import StatusBadge from "./StatusBadge";
import { renderField } from "../../utils/tableUtils";
import { createPortal } from "react-dom";
import { closeModal } from '../../store/slices/modalSlice';

const DetailModal = () => {
  const dispatch = useDispatch();
const record = useSelector((state) => state.ui.modals.recordDetail);
if (!record) return null;

  const handleClose = () => {
    dispatch(closeModal());
  };

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  };

  if (!record) return null;

  return createPortal(
    <>
      <div 
        className="modal-backdrop show"
        style={{ zIndex: 1040 }}
        onClick={handleBackdropClick}
      />
      
      {/* Modal */}
      <div 
        className="modal show d-block" 
        tabIndex="-1"
        style={{ zIndex: 1050 }}
        onClick={handleBackdropClick}
      >
        <div className="modal-dialog modal-xl">
          <div 
            className="modal-content"
            onClick={(e) => e.stopPropagation()} // Prevent click propagation to backdrop
          >
            <div className="modal-header">
              <h5 className="modal-title">
                Call Record Details
                {record?.systemCallId && (
                  <small className="text-muted ms-2">
                    #{record.systemCallId}
                  </small>
                )}
              </h5>
              <button 
                type="button" 
                className="btn-close" 
                onClick={handleClose}
                aria-label="Close"
              />
            </div>

            <div className="modal-body">
              <div className="row">
                <div className="col-md-6">
                  <div className="detail-section">
                    <h6>Basic Information</h6>
                    {renderField("Time", record.callTimestamp, "date")}
                    {renderField("Caller ID", record.callerId)}
                    {renderField("Campaign", record.campaignName)}
                    {renderField("Publisher", record.systemName)}
                    {renderField("Duration", `${record.durationSec} seconds`)}
                  </div>

                  <div className="detail-section">
                    <h6>QC Information</h6>
                    {record.qc?.disposition && (
                      <div className="detail-field">
                        <label>Status:</label>
                        <StatusBadge status={record.qc.disposition} size="lg" />
                      </div>
                    )}
                    {renderField("Sub Disposition", record.qc?.sub_disposition)}
                    {renderField("Reason", record.qc?.reason)}
                    {renderField("Summary", record.qc?.summary)}
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="detail-section">
                    <h6>System Information</h6>
                    {renderField("System Call ID", record.systemCallId)}
                    {renderField("System Publisher ID", record.systemPublisherId)}
                    {renderField("System Buyer ID", record.systemBuyerId)}
                  </div>

                  {record.recordingUrl && (
                    <div className="detail-section">
                      <h6>Recording</h6>
                      <audio controls className="w-100">
                        <source src={record.recordingUrl} type="audio/mpeg" />
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  )}

                  {record.transcript && (
                    <div className="detail-section">
                      <h6 style={{ fontWeight: "bold" }}>Transcript</h6>
                      <div
                        className="transcript-box"
                        style={{
                          maxHeight: "300px",
                          overflowY: "auto",
                          whiteSpace: "pre-wrap",
                          wordWrap: "break-word",
                          padding: "8px",
                          borderRadius: "4px",
                        }}
                      >
                        {record.transcript}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handleClose}>
                Close
              </button>
              {record.recordingUrl && (
                <a
                  href={record.recordingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  <i className="bi bi-download me-1" />
                  Download Recording
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default React.memo(DetailModal);