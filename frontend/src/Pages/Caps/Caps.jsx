import React, { useState, useMemo } from "react";
import {
  useGetCapsQuery,
  useFetchCapsMutation,
  useUpdateTargetMutation,
} from "../../store/api/Caps";
import { ToastContainer, toast } from "react-toastify";

const Caps = () => {
  const [search, setSearch] = useState("");
  const [localTargets, setLocalTargets] = useState({});
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("percentComplete");
  const [order, setOrder] = useState("desc");

  const { data, isLoading, refetch } = useGetCapsQuery({
    startDate,
    endDate,
    sortBy,
    order,
  });

  const [fetchCaps, { isLoading: fetching }] = useFetchCapsMutation();
  const [updateTarget] = useUpdateTargetMutation();

  const handleFetchCaps = async () => {
    try {
      await fetchCaps().unwrap();
      toast.success("Caps fetched successfully");
      refetch();
    } catch {
      toast.error("Error fetching caps");
    }
  };

  const saveTarget = async (id, value) => {
    try {
      await updateTarget({ id, target: Number(value) || 0 }).unwrap();
      toast.success("Target updated");
    } catch {
      toast.error("Failed to update target");
    }
  };

  const filteredData = useMemo(() => {
    if (!data?.data) return [];

    return data.data.filter((c) =>
      (c.target_name || c.name).toLowerCase().includes(search.toLowerCase())
    );
  }, [data, search]);

  const getRowClass = (percent) => {
    if (percent >= 100) return "table-danger";
    if (percent >= 80) return "table-warning";
    return "";
  };
  const handleSort = (column) => {
    if (sortBy === column) {
      setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setOrder("desc");
    }
  };

  return (
    <div className="container py-4" style={{ fontSize: "0.8rem" }}>
      <ToastContainer />

      <div className="d-flex gap-2 mb-3">
        <input
          type="text"
          className="form-control form-control-sm"
          placeholder="Search target..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <input
          type="date"
          className="form-control form-control-sm"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />

        <input
          type="date"
          className="form-control form-control-sm"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      <table className="table table-sm table-hover">
        <thead className="table-dark">
          <tr>
            <th>#</th>
            <th
              onClick={() => handleSort("target_name")}
              style={{ cursor: "pointer" }}
            >
              Target {sortBy === "target_name" && (order === "asc" ? "↑" : "↓")}
            </th>

            <th
              onClick={() => handleSort("completedCalls")}
              style={{ cursor: "pointer" }}
            >
              Completed{" "}
              {sortBy === "completedCalls" && (order === "asc" ? "↑" : "↓")}
            </th>

            <th
              onClick={() => handleSort("paidCalls")}
              style={{ cursor: "pointer" }}
            >
              Paid {sortBy === "paidCalls" && (order === "asc" ? "↑" : "↓")}
            </th>

            <th>Target</th>

            <th
              onClick={() => handleSort("percentComplete")}
              style={{ cursor: "pointer" }}
            >
              % Complete{" "}
              {sortBy === "percentComplete" && (order === "asc" ? "↑" : "↓")}
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredData.map((cap, i) => (
            <tr key={cap._id} className={getRowClass(cap.percentComplete)}>
              <td>{i + 1}</td>
              <td>{cap.target_name || cap.name}</td>
              <td>{cap.completedCalls}</td>
              <td>{cap.paidCalls}</td>
              <td>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  style={{ width: 70 }}
                  defaultValue={cap.target}
                  onBlur={(e) => saveTarget(cap._id, e.target.value)}
                />
              </td>
              <td>
                <span className="badge bg-info">{cap.percentComplete}%</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isLoading && <div className="text-center">Loading...</div>}
    </div>
  );
};

export default Caps;
