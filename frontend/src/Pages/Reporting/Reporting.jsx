import React from "react";
import StatsCards from "../../components/StatsCards";
import { toast } from "react-toastify";
import { useGetStatsQuery } from "../../store/api/callsApi";
import withPageFilters from "../../Layout/withPageFilters";
import Loader from "../../components/Loader/Loader";
import { useQueryParams } from "../../hooks/useQueryParams";

const Reporting = ({
  filters,
  selectedCampaigns,
  selectedPublishers,
  selectedTargets,
  selectedBuyers,
}) => {  const queryParams = useQueryParams({
    filters,
    selectedCampaigns,
    selectedPublishers,
    selectedTargets,
    selectedBuyers,
  });

  const { data: stats, error, isLoading, isFetching } = useGetStatsQuery(queryParams, {
    refetchOnMountOrArgChange: true,
  });
  React.useEffect(() => {
    if (error) toast.error("Failed to fetch stats");
  }, [error]);

  if (isLoading) return <Loader message="Loading stats..." />;

  return (
    <div className={isFetching ? "opacity-75" : ""}>
      <StatsCards stats={stats || {}} />
    </div>
  );
};

export default withPageFilters(Reporting);
