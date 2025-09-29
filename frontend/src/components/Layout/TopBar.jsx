import React, { memo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { openModal as openModalAction } from "../../store/slices/modalSlice";
import { selectFiltersLabel } from "../../store/slices/filtersSlice";

const TopBar = memo(({
  onToggleFilters,
  autoRefresh,
  setAutoRefresh,
}) => {
  const dispatch = useDispatch();
  const filtersLabel = useSelector(selectFiltersLabel);

  const handleOpenModal = useCallback((modalType) => {
    dispatch(openModalAction({ modalType }));
  }, [dispatch]);

  const handleToggleAutoRefresh = useCallback(() => {
    setAutoRefresh(!autoRefresh);
  }, [autoRefresh, setAutoRefresh]);

  const modalButtons = [
    { type: "campaign", label: "Campaigns", title: "Pick Campaigns" },
    { type: "publisher", label: "Publishers", title: "Pick Publishers" },
    { type: "target", label: "Targets", title: "Pick Targets" },
    { type: "buyer", label: "Buyers", title: "Pick Buyers" }
  ];

  return (
    <div className="topbar d-flex align-items-center py-3 border-bottom container-fluid">
      <div className="d-flex flex-column align-items-start">
        <h3 className="mb-1 text-white fw-light">Welcome Back HLG!</h3>
        <small className="text-white fw-light" style={{ fontSize: "0.7rem" }}>
          Track, Manage, and Analyse Leads with AI QC Bots
        </small>
      </div>

      <div className="ms-auto d-flex align-items-center text-white gap-2">
        {modalButtons.map(({ type, label, title }) => (
          <button
            key={type}
            className="btn btn-outline-white text-white btn-sm me-2"
            style={{ backgroundColor: "#18243c" }}
            onClick={() => handleOpenModal(type)}
            title={title}
          >
            {label}
          </button>
        ))}

        <button
          className="btn btn-outline-white text-white btn-sm me-2 d-flex align-items-center gap-2"
          style={{ backgroundColor: "#18243c" }}
          onClick={onToggleFilters}
          title="Filters"
        >
          <i className="bi bi-funnel" />
          {filtersLabel}
        </button>

        <button
          className="btn btn-sm me-2"
          onClick={handleToggleAutoRefresh}
          style={{
            backgroundColor: autoRefresh ? "#0d6477" : "#12172B",
            color: "#fff",
            fontWeight: "500",
          }}
        >
          <i className="bi bi-arrow-clockwise" /> Auto Refresh
        </button>
      </div>
    </div>
  );
});

TopBar.displayName = "TopBar";

export default TopBar;