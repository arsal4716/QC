import CampaignModal from "./ModalBox/CampaignModal";
import PublisherModal from "./ModalBox/PublisherModal";

export default function TopBar({
  onToggleFilters,
  onApplyPublishers,
  onApplyCampaigns,
  autoRefresh,
  setAutoRefresh,
  rangeLabel,
}) {
  return (
    <div className="topbar d-flex align-items-center py-3 border-bottom container-fluid">
      <div className="d-flex align-items-center">
        <h3 className="mb-0 text-white">Welcome Back HLG!</h3>
      </div>

      <div className="ms-auto d-flex align-items-center text-white gap-2">
        <button
          className="btn btn-outline-white text-white btn-sm me-2"
          data-bs-toggle="modal"
          data-bs-target="#campaignModal"
          style={{ backgroundColor: "#0d6477" }}
          title="Pick Campaigns"
        >
          <i className="bi bi-bullseye" /> Campaigns
        </button>

        <button
          className="btn btn-outline-white text-white btn-sm me-2"
          data-bs-toggle="modal"
          data-bs-target="#publisherModal"
          style={{ backgroundColor: "#0a7c6b" }}
          title="Pick Publishers"
        >
          <i className="bi bi-people" /> Publishers
        </button>

        <button
          className="btn btn-outline-white text-white btn-sm me-2 d-flex align-items-center gap-2"
          onClick={onToggleFilters}
          style={{ backgroundColor: "#18243c" }}
        >
          <i className="bi bi-funnel" />
          {rangeLabel ? rangeLabel : "Filters"}
        </button>

        <button
          className="btn btn-sm me-2"
          onClick={() => setAutoRefresh(!autoRefresh)}
          style={{
            backgroundColor: autoRefresh ? "#0d6477" : "#12172B", 
            color: "#fff",
            fontWeight: "500",
          }}
        >
          <i className="bi bi-arrow-clockwise" /> Auto Refresh
        </button>
      </div>

      <CampaignModal
        id="campaignModal"
        onApply={(selectedCampaigns) => {
          console.log("Selected campaigns:", selectedCampaigns);
          if (onApplyCampaigns) onApplyCampaigns(selectedCampaigns);
        }}
      />
      <PublisherModal
        id="publisherModal"
        onApply={(selectedPublishers) => {
          console.log("Selected publishers:", selectedPublishers);
          if (onApplyPublishers) onApplyPublishers(selectedPublishers);
        }}
      />
    </div>
  );
}
