import React, { memo, useCallback, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useGetRecordsQuery } from "../../store/api/callsApi";
import { setRecordDetail } from "../../store/slices/modalSlice";
import { setFilters } from "../../store/slices/filtersSlice";
import { useDebounce } from "../../hooks/useDebounce";
import VirtualizedTable from "./VirtualizedTable";
import { useColumns } from "../../contexts/ColumnsContext";
import TableFilter from "../Filters/TableFilter";
import { useQueryParams } from "../../hooks/useQueryParams";
import { useExportManager } from "../../hooks/useExportManager";

const RecordsTable = memo(({ refreshKey, system }) => {
  const dispatch = useDispatch();
  const filters = useSelector((state) => state.filters);
  const { exportState, exportRecords, downloadBlob, resetExportState } =
    useExportManager();

  const searchValue = filters.search || "";
  const debouncedSearch = useDebounce(searchValue, 300);
  const { columns } = useColumns();
  const baseQueryParams = useQueryParams();

  // Scope every request (and export) to the active system (Ringba / CallGrid).
  const queryParams = useMemo(
    () => (system ? { ...baseQueryParams, system } : baseQueryParams),
    [baseQueryParams, system],
  );

  // Export ONLY the columns the user has made visible, in display order.
  const visibleColumnKeys = useMemo(
    () =>
      (columns || [])
        .filter((c) => c && c.visible && c.key)
        .map((c) => c.key)
        .join(","),
    [columns],
  );

  const handleExport = useCallback(
    async (format) => {
      try {
        const blob = await exportRecords({
          ...queryParams,
          columns: visibleColumnKeys,
          fmt: format,
        });
        downloadBlob(blob, format);
        setTimeout(() => {
          resetExportState();
        }, 3000);
      } catch (err) {
        console.error("Export failed", err);
      }
    },
    [exportRecords, downloadBlob, resetExportState, queryParams, visibleColumnKeys],
  );

  const handleExportProgressHide = useCallback(() => {
    resetExportState();
  }, [resetExportState]);

  const handleRowClick = useCallback(
    (record) => {
      if (record) dispatch(setRecordDetail(record));
    },
    [dispatch],
  );

  const handleSort = useCallback(
    (sortBy, sortDir) => {
      dispatch(setFilters({ sortBy, sortDir, page: 1 }));
    },
    [dispatch],
  );

  const handlePageChange = useCallback(
    (page) => {
      dispatch(setFilters({ page }));
    },
    [dispatch],
  );

  const handleSearch = useCallback(
    (searchTerm) => {
      dispatch(setFilters({ search: searchTerm, page: 1 }));
    },
    [dispatch],
  );

  const handleDispositionChange = useCallback(
    (newDispositions) => {
      dispatch(setFilters({ disposition: newDispositions, page: 1 }));
    },
    [dispatch],
  );

  const handleStatusChange = useCallback(
    (newStatuses) => {
      dispatch(setFilters({ status: newStatuses, page: 1 }));
    },
    [dispatch],
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
      style={{
        backgroundColor: "#17233d",
        overflow: "visible", 
        minHeight: "500px", 
        display: "flex",
        flexDirection: "column",
        position: "relative", 
      }}
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
        exportState={exportState}
        onExportProgressHide={handleExportProgressHide}
      />

      {/* Table Container with proper spacing */}
      <div
        style={{
          flex: 1,
          minHeight: "300px",
          position: "relative",
          zIndex: 1, 
        }}
      >
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
    </div>
  );
});

RecordsTable.displayName = "RecordsTable";
export default RecordsTable;
