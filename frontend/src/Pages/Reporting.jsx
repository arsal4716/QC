import React, { useEffect, useState } from "react";
import StatsCards from "../components/StatsCards";
import { toast } from "react-toastify";
import { getStats } from "../api/callsApi";
import withPageFilters from "../Layout/withPageFilters";

const Reporting = ({ filters, refreshKey, selectedCampaigns, selectedPublishers }) => {
  const [stats, setStats] = useState({});

  const fetchStats = async (filters) => {
    try {
      const data = await getStats({
        ...filters,
        campaign: selectedCampaigns.join(','),
        publisher: selectedPublishers.join(',')
      });
      setStats(data);
    } catch {
      toast.error("Failed to fetch stats");
    }
  };

  useEffect(() => {
    fetchStats(filters);
  }, [filters, refreshKey, selectedCampaigns, selectedPublishers]);

  return <StatsCards stats={stats} />;
};

export default withPageFilters(Reporting);