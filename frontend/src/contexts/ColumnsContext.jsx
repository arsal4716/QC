import React, { createContext, useState, useEffect } from 'react';
export const ColumnsContext = createContext();
const DEFAULT_COLUMNS = [
  { key: "callTimestamp", label: "Time Stamp", visible: true },
  { key: "systemName", label: "Publisher", visible: true },
  { key: "callerId", label: "Caller ID", visible: true },
  { key: "qc.disposition", label: "Status", visible: true },
  { key: "qc.sub_disposition", label: "Sub Disposition", visible: true },
  { key: "durationSec", label: "Duration (Sec)", visible: true },
  { key: "campaignName", label: "Campaign Name", visible: true },
  { key: "qc.reason", label: "Reason", visible: true, truncate: true },   
  { key: "qc.summary", label: "Summary", visible: true, truncate: true },
  { key: "transcript", label: "Transcript", visible: true, truncate: true },
  { key: "ringbaRaw.caller_number", label: "Inbound Phone Number", visible: true },
  { key: "recordingUrl", label: "Recording", visible: true },
  { key: "systemCallId", label: "System Call ID", visible: true },
  { key: "systemPublisherId", label: "Publisher ID", visible: true },
];


export const ColumnsProvider = ({ children }) => {
  const [columns, setColumns] = useState(() => {
    try {
      const raw = localStorage.getItem("qc_columns");
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) ? parsed : DEFAULT_COLUMNS;
    } catch {
      return DEFAULT_COLUMNS;
    }
  });

  useEffect(() => {
    localStorage.setItem("qc_columns", JSON.stringify(columns));
  }, [columns]);

  return (
    <ColumnsContext.Provider value={{ columns, setColumns }}>
      {children}
    </ColumnsContext.Provider>
  );
};
