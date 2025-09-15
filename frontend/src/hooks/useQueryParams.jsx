// src/hooks/useQueryParams.js
import { useMemo } from "react";
import { useSelector } from "react-redux";

export const useQueryParams = () => {
  const filters = useSelector((state) => state.filters);

  return useMemo(() => {
    const params = {
      page: filters.page || 1,
      limit: filters.limit || 25,
      sortBy: filters.sortBy || "callTimestamp",
      sortDir: filters.sortDir || "desc",
      datePreset: filters.datePreset || "today",
    };

    if (filters.search && filters.search.trim()) {
      params.search = filters.search.trim();
    }
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;

    if (filters.campaign?.length) params.campaign = filters.campaign.join(",");
    if (filters.publisher?.length) params.publisher = filters.publisher.join(",");
    if (filters.target?.length) params.target = filters.target.join(",");
    if (filters.buyer?.length) params.buyer = filters.buyer.join(",");
    if (filters.status?.length) params.status = filters.status.join(",");
if (filters.disposition?.length) {
  params.disposition = filters.disposition; 
}
    return params;
  }, [
    filters.page,
    filters.limit,
    filters.sortBy,
    filters.sortDir,
    filters.datePreset,
    filters.startDate,
    filters.endDate,
    filters.search,
    filters.campaign,
    filters.publisher,
    filters.target,
    filters.buyer,
    filters.status,
    filters.disposition, 
  ]);
};
