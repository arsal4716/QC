import React, { memo } from 'react';
const StatCard = memo(({ label, value, isLoading }) => (
  <div className="col">
    <div
      className="card text-white border-0 h-100"
      style={{ backgroundColor: "#17233d" }}
    >
      <div className="card-body p-3">
        <div className="small text-light opacity-75">{label}</div>
        <h4 className="mt-2 mb-0">
          {isLoading ? (
            <div className="spinner-border spinner-border-sm" role="status" />
          ) : (
            value ?? 0
          )}
        </h4>
      </div>
    </div>
  </div>
));

StatCard.displayName = 'StatCard';

const statsConfig = [
  { key: "totalProcessed", label: "Total Processed" },
  { key: "Sales", label: "Sales" },
  { key: "notInterested", label: "Not Interested" },
  { key: "notQualified", label: "Not Qualified" },
  { key: "dnc", label: "DNC" },
  { key: "voicemail", label: "Voicemail" },
  { key: "techIssues", label: "Tech Issues" },
  { key: "dwspi", label: "DWSPI" },
  { key: "unresponsive", label: "Unresponsive" },
  { key: "hungup", label: "Hungup" },
  { key: "callback", label: "Callback" },
  { key: "ivr", label: "IVR" },
  { key: "subsidy", label: "Subsidy" },
  { key: "languageBarrier", label: "Language Barrier" },
  { key: "misdialed", label: "Misdialed" },
];

const StatsCards = ({ stats: statsProp }) => {
  const stats = statsProp || {}; 
  const isLoading = !statsProp;

  return (
    <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-5 g-1 mb-4 mt-1">
      {statsConfig.map((config) => {
        const value = config.key === 'totalProcessed' 
          ? stats.totalCalls 
          : stats.dispositions?.find(d => d.disposition.toLowerCase() === config.key.toLowerCase())?.count || 0;

        return (
          <StatCard
            key={config.key}
            label={config.label}
            value={value}
            isLoading={isLoading}
          />
        );
      })}
    </div>
  );
};


export default memo(StatsCards);