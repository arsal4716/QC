import React, { memo } from "react";

const StatCard = memo(({ label, count, percentage, isLoading, flag }) => {
  return (
    <div className="col">
      <div
        className="card text-white border-0 h-100"
        style={{ backgroundColor: "#17233d" }}
      >
        <div className="card-body p-3">
          <div className="small text-light opacity-75 d-flex justify-content-between">
            <span>{label}</span>
            {flag && (
              <span
                className="badge rounded-pill ms-2"
                style={{
                  fontSize: "0.65rem",
                  backgroundColor: "#dc3545",
                }}
              >
                ⚠
              </span>
            )}
          </div>

          {isLoading ? (
            <div
              className="spinner-border spinner-border-sm mt-3 text-light"
              role="status"
            />
          ) : (
            <div className="d-flex justify-content-between align-items-center mt-2">
              <h5 className="mb-0">{count ?? 0}</h5>
              <span
                className="badge rounded-pill"
                style={{
                  fontSize: "0.7rem",
                  backgroundColor: "#a4dbc2", 
                  color: "#000",
                  minWidth: "45px",
                  textAlign: "center",
                }}
              >
                {percentage >= 0 ? "↑" : "↓"} {Math.abs(percentage || 0)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

StatCard.displayName = "StatCard";

const statsConfig = [
  { key: "totalProcessed", label: "Total Processed" },
  { key: "Sales", label: "Sales" },
  { key: "Not Interested", label: "Not Interested" },
  { key: "Not Qualified", label: "Not Qualified" },
  { key: "DNC", label: "DNC" },
  { key: "Voicemail", label: "Voicemail", flagKey: "flagVoicemail" },
  { key: "Tech Issues", label: "Tech Issues" },
  { key: "DWSPI", label: "DWSPI" },
  { key: "Unresponsive", label: "Unresponsive" },
  { key: "Target hung up", label: "Hungup", flagKey: "flagTargetHU" },
  { key: "Callback", label: "Callback" },
  { key: "IVR", label: "IVR" },
  { key: "subsidy/incentivised", label: "Subsidy" },
  { key: "Language Barrier", label: "Language Barrier" },
  { key: "Misdialed", label: "Misdialed" },
  { key: "RejectedUnknown", label: "Rejected / Unknown", flagKey: "flagRejectedUnknown" },
  { key: "RedNoConnect", label: "Red No Connects", flagKey: "flagRedNoConnect" },
];

const StatsCards = ({ stats: statsProp }) => {
  const stats = statsProp || {};
  const isLoading = !statsProp;

  return (
    <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-5 g-2 mb-4 mt-1">
      {statsConfig.map((config) => {
        const statItem =
          config.key === "totalProcessed"
            ? {
                count: stats.totalCalls || 0,
                percentage: stats.totalCalls > 0 ? 100 : 0,
              }
            : config.key === "RejectedUnknown"
            ? {
                count: stats.flags?.rejectedUnknownCount || 0,
                percentage: stats.flags?.rejectedUnknownPct || 0,
              }
            : config.key === "RedNoConnect"
            ? {
                count: stats.flags?.redNoConnectCount || 0,
                percentage: stats.flags?.redNoConnectPct || 0,
              }
            : stats.dispositions?.find(
                (d) => d.disposition.toLowerCase() === config.key.toLowerCase()
              );

        let flag = false;
        if (config.flagKey) {
          flag = !!stats.flags?.[config.flagKey];
        }

        return (
          <StatCard
            key={config.key}
            label={config.label}
            count={statItem?.count || 0}
            percentage={parseFloat(statItem?.percentage || 0)}
            isLoading={isLoading}
            flag={flag}
          />
        );
      })}
    </div>
  );
};

export default memo(StatsCards);
