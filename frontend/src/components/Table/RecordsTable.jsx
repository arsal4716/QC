// src/components/Records/RecordsTable.jsx
import React, { memo, useCallback, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  useGetRecordsQuery,
  useExportRecordsMutation,
} from "../../store/api/callsApi";
import { setRecordDetail } from "../../store/slices/modalSlice";
import { setFilters } from "../../store/slices/filtersSlice";
import { useDebounce } from "../../hooks/useDebounce";
import VirtualizedTable from "./VirtualizedTable";
import { createDefaultColumns } from "../../contexts/ColumnsContext";
import TableFilter from "../Filters/TableFilter";
import { useQueryParams } from "../../hooks/useQueryParams";

const RecordsTable = memo(({ refreshKey }) => {
  const dispatch = useDispatch();
  const filters = useSelector((state) => state.filters);
  const [exportRecords] = useExportRecordsMutation();

  const searchValue = filters.search || "";
  const debouncedSearch = useDebounce(searchValue, 300);
  const columns = useMemo(() => createDefaultColumns(), []);

  const queryParams = useQueryParams();

  const handleExport = useCallback(
    async (format) => {
      try {
        const blob = await exportRecords({
          ...queryParams,
          fmt: format,
        }).unwrap();

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `records.${format}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } catch (err) {
        console.error("Export failed", err);
      }
    },
    [exportRecords, queryParams]
  );

  const handleStatusChange = useCallback(
    (newStatuses) => {
      dispatch(setFilters({ status: newStatuses, page: 1 }));
    },
    [dispatch]
  );

const handleRowClick = useCallback(
  (record) => {
    if (record) dispatch(setRecordDetail(record));
  },
  [dispatch]
);

  const handleSort = useCallback(
    (sortBy, sortDir) => {
      dispatch(setFilters({ sortBy, sortDir, page: 1 }));
    },
    [dispatch]
  );

  const handlePageChange = useCallback(
    (page) => {
      dispatch(setFilters({ page }));
    },
    [dispatch]
  );

  const handleSearch = useCallback(
    (searchTerm) => {
      dispatch(setFilters({ search: searchTerm, page: 1 }));
    },
    [dispatch]
  );
  const handleDispositionChange = useCallback(
    (newDispositions) => {
      dispatch(setFilters({ disposition: newDispositions, page: 1 }));
    },
    [dispatch]
  );
  const { autoRefresh, refreshInterval } = useSelector((s) => s.ui) || {};
  const pollingInterval = autoRefresh ? refreshInterval : 0;
  const {
    data: recordsData,
    error,
    isLoading,
    isFetching,
  } = useGetRecordsQuery(queryParams, {
    pollingInterval,
    refetchOnMountOrArgChange: true,
  });

  const transformedData = useMemo(() => {
    if (!recordsData?.data || !Array.isArray(recordsData.data)) return [];
    return recordsData.data;
  }, [recordsData]);

  if (error) {
    return (
      <div className="alert alert-danger">
        Failed to load records. {error?.message || ""}
      </div>
    );
  }

  return (
    <div
      className="card"
      style={{ backgroundColor: "#17233d", overflow: "hidden" }}
    >
      <TableFilter
        search={searchValue}
        setSearch={handleSearch}
        onSearch={handleSearch}
        onExport={handleExport}
        selectedStatuses={filters.status || []}
        onStatusChange={handleStatusChange}
        selectedDispositions={filters.disposition || []}
        onDispositionChange={handleDispositionChange}
      />
      <VirtualizedTable
        data={transformedData}
        columns={columns}
        loading={isLoading}
        isFetching={isFetching}
        totalCount={recordsData?.meta?.total || 0}
        pagination={recordsData?.meta}
        onRowClick={handleRowClick}
        onSort={handleSort}
        onPageChange={handlePageChange}
        sortBy={filters.sortBy}
        sortDir={filters.sortDir}
      />
    </div>
  );
});

RecordsTable.displayName = "RecordsTable";
export default RecordsTable;
