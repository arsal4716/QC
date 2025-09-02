export default function StatsCards({ stats }) {
  const cards = [
    { key: "totalProcessed", label: "Total Processed" },
    { key: "sale", label: "Sale" },
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

  return (
    <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-5 g-1 mb-4">
      {cards.map((c) => (
        <div key={c.key} className="col">
          <div
            className="card text-white border-0 h-100"
            style={{ backgroundColor: "#17233d" }}
          >
            <div className="card-body p-3">
              <div className="small text-light opacity-75">{c.label}</div>
              <h4 className="mt-2 mb-0">{stats?.[c.key] ?? 0}</h4>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
