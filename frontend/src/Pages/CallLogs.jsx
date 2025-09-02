import RecordsTable from "../components/RecordsTable";
import withPageFilters from "../Layout/withPageFilters";

const CallLogs = ({ filters, refreshKey, selectedCampaigns, selectedPublishers }) => {
  return (
    <div className="card shadow-sm">
      <div className="card-body p-0">
        <RecordsTable 
          filters={filters} 
          refreshKey={refreshKey}
          selectedCampaigns={selectedCampaigns}
          selectedPublishers={selectedPublishers}
        />
      </div>
    </div>
  );
};

export default withPageFilters(CallLogs);