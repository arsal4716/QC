import React, { useState, useMemo } from "react";
import {
  useGetCapsQuery,
  useFetchCapsMutation,
  useUpdateTargetMutation,
} from "../../store/api/Caps";
import { ToastContainer, toast } from "react-toastify";

const Caps = () => {
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  const { data, isLoading, refetch } = useGetCapsQuery();
  const [fetchCaps, { isLoading: fetching }] = useFetchCapsMutation();
  const [updateTarget] = useUpdateTargetMutation();

  const handleFetchCaps = async () => {
    try {
      await fetchCaps().unwrap();
      toast.success("Caps fetched and updated successfully");
      await refetch();
    } catch {
      toast.error("Error fetching caps");
    }
  };

  const handleTargetChange = async (id, value) => {
    const num = parseInt(value) || 0;
    try {
      await updateTarget({ id, target: num }).unwrap();
      toast.success("Target updated");
    } catch {
      toast.error("Failed to update target");
    }
  };

  const filteredData = useMemo(() => {
    if (!data?.data) return [];
    let caps = data.data;

    if (!showAll) {
      caps = caps.filter(
        (c) =>
          c.enabled ||
          [c.hourlyCap, c.dailyCap, c.monthlyCap, c.allTimeCap].some(
            (v) => v > 0
          )
      );
    }

    if (search.trim()) {
      const lower = search.toLowerCase();
      caps = caps.filter((c) => c.name.toLowerCase().includes(lower));
    }

    return caps;
  }, [data, showAll, search]);

  return (
    <div className="container py-4">
      <ToastContainer />
      <div className="d-flex justify-content-between align-items-center mb-3">
        <input
          type="text"
          className="form-control w-50"
          placeholder="Search targets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div>
          <button
            className={`btn ${
              showAll ? "btn-secondary" : "btn-outline-secondary"
            } mx-2`}
            onClick={() => setShowAll((prev) => !prev)}
          >
            {showAll ? "Hide Unset" : "Show All"}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleFetchCaps}
            disabled={fetching}
          >
            {fetching ? "Fetching..." : "Fetch Caps"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" />
          <p className="mt-3">Loading caps...</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead className="table-dark">
              <tr>
                <th>Name</th>
                <th>Number</th>
                <th>Concurrency</th>
                <th>Hourly</th>
                <th>Daily</th>
                <th>Monthly</th>
                <th>All-Time</th>
                <th>Enabled</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center py-3">
                    No caps found
                  </td>
                </tr>
              ) : (
                filteredData.map((cap, index) => (
                  <tr key={cap._id}>
                    <td>{index + 1}</td>
                    <td>{cap.name}</td>
                    <td>{cap.number}</td>
                    <td>{cap.concurrencyCap}</td>
                    <td>{cap.hourlyCap}</td>
                    <td>{cap.dailyCap}</td>
                    <td>{cap.monthlyCap}</td>
                    <td>{cap.allTimeCap}</td>
                    <td>
                      <span
                        className={`badge ${
                          cap.enabled ? "bg-success" : "bg-danger"
                        }`}
                      >
                        {cap.enabled ? "Yes" : "No"}
                      </span>
                    </td>
                    <td>
                      <input
                        type="number"
                        value={cap.target || ""}
                        className="form-control form-control-sm"
                        style={{ maxWidth: 80 }}
                        onChange={(e) =>
                          handleTargetChange(cap._id, e.target.value)
                        }
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Caps;
