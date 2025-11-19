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
  const [localTargets, setLocalTargets] = useState({});

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

  const setLocalTarget = (id, value) => {
    setLocalTargets((prev) => ({ ...prev, [id]: value }));
  };

  const saveTarget = async (id, value) => {
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

    if (search.trim()) {
      const lower = search.toLowerCase();
      caps = caps.filter((c) =>
        (c.target_name || c.name).toLowerCase().includes(lower)
      );
    }

    return caps;
  }, [data, search]);

  return (
    <div className="container py-4" style={{ fontSize: "0.8rem" }}>
      <ToastContainer />
      <div className="d-flex justify-content-between align-items-center mb-3">
        <input
          type="text"
          className="form-control form-control-sm w-50"
          placeholder="Search targets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ fontSize: "0.8rem" }}
        />
        <div>
          <button
            className={`btn btn-sm ${
              showAll ? "btn-secondary" : "btn-outline-secondary"
            } mx-2`}
            onClick={() => setShowAll((prev) => !prev)}
          >
            {showAll ? "Hide Unset" : "Show All"}
          </button>
          <button
            className="btn btn-sm btn-primary"
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
          <p className="mt-3" style={{ fontSize: "0.8rem" }}>
            Loading caps...
          </p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped table-hover table-sm">
            <thead className="table-dark" style={{ fontSize: "0.8rem" }}>
              <tr>
                <th>Sr.No</th>
                <th>Target Name</th>
                <th>Completed Calls</th>
                <th>Paid</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: "0.8rem" }}>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-2">
                    No caps found
                  </td>
                </tr>
              ) : (
                filteredData.map((cap, index) => (
                  <tr key={cap._id}>
                    <td>{index + 1}</td>
                    <td>{cap.target_name || cap.name}</td> {/* updated */}
                    <td>{cap.completedCalls || 0}</td>
                    <td>
                      <span
                        className={`badge ${
                          cap.paidCalls > 0 ? "bg-success" : "bg-secondary"
                        }`}
                      >
                        {cap.paidCalls || 0}
                      </span>
                    </td>
                    <td>
                      <input
                        type="number"
                        value={localTargets[cap._id] ?? cap.target ?? ""}
                        className="form-control form-control-sm"
                        style={{
                          maxWidth: 70,
                          fontSize: "0.75rem",
                          padding: "0.25rem",
                        }}
                        onChange={(e) =>
                          setLocalTarget(cap._id, e.target.value)
                        }
                        onBlur={(e) => saveTarget(cap._id, e.target.value)}
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
