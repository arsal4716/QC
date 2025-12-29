// src/store/slices/filtersSlice.js
import { createSlice } from "@reduxjs/toolkit";

const normalizeToArray = (payload) => {
  if (!payload) return [];
  return Array.isArray(payload) ? payload : [payload];
};

const initialState = {
  datePreset: "today",
  startDate: null,
  endDate: null,
  campaign: [],
  publisher: [],
  target: [],
  buyer: [],
  disposition: [],
  status: null,
  search: "",
  page: 1,
  limit: 25,
  sortBy: "callTimestamp",
  sortDir: "desc",
  selectedCampaigns: [],
  selectedPublishers: [],
  selectedTarget: [],
  selectedBuyer: [],
  selectedDispositions: [],
  callerId: null,
};

const filtersSlice = createSlice({
  name: "filters",
  initialState,
  reducers: {
    setFilters: (state, action) => {
      const payload = action.payload || {};
      return { ...state, ...payload };
    },
    setDatePreset: (state, action) => {
      state.datePreset = action.payload;
      state.startDate = null;
      state.endDate = null;
      state.page = 1;
    },
    setDateRange: (state, action) => {
      const { startDate, endDate } = action.payload || {};
      state.datePreset = "custom";
      state.startDate = startDate || null;
      state.endDate = endDate || null;
      state.page = 1;
    },
    setSearch: (state, action) => {
      state.search = action.payload || "";
      state.page = 1;
    },
    setSelectedCampaigns: (state, action) => {
      const list = normalizeToArray(action.payload);
      state.selectedCampaigns = list;
      state.campaign = list;
      state.page = 1;
    },
    setSelectedPublishers: (state, action) => {
      const list = normalizeToArray(action.payload);
      state.selectedPublishers = list;
      state.publisher = list;
      state.page = 1;
    },
    setSelectedTarget: (state, action) => {
      const list = normalizeToArray(action.payload);
      state.selectedTarget = list;
      state.target = list;
      state.page = 1;
    },
    setSelectedBuyer: (state, action) => {
      const list = normalizeToArray(action.payload);
      state.selectedBuyer = list;
      state.buyer = list;
      state.page = 1;
    },
    setSelectedDispositions: (state, action) => {
      const list = normalizeToArray(action.payload);
      state.selectedDispositions = list;
      state.disposition = list;
      state.page = 1;
    },
    setPage: (state, action) => {
      state.page = Math.max(1, Number(action.payload) || 1);
    },
    resetFilters: () => {
  return initialState;
},

  },
});

export const selectFiltersLabel = (state) => {
  const {
    datePreset,
    selectedCampaigns,
    selectedPublishers,
    selectedTarget,
    selectedBuyer,
    callerId,
  } = state.filters;

  let parts = [];

  if (datePreset) parts.push(datePreset.replace(/_/g, " "));
  if (selectedCampaigns?.length)
    parts.push(`Campaigns (${selectedCampaigns.length})`);
  if (selectedPublishers?.length)
    parts.push(`Publishers (${selectedPublishers.length})`);
  if (selectedTarget?.length)
    parts.push(`Target (${selectedTarget.length})`);
  if (selectedBuyer?.length)
    parts.push(`Buyer (${selectedBuyer.length})`);
  if (callerId) parts.push(`Caller ID: ${callerId}`);

  return parts.length > 0 ? parts.join(" | ") : "Filters";
};

export const {
  setFilters,
  setDatePreset,
  setDateRange,
  setSearch,
  setSelectedCampaigns,
  setSelectedPublishers,
  setSelectedTarget,
  setSelectedBuyer,
  setSelectedDispositions,
  setPage,
  resetFilters,
} = filtersSlice.actions;

export default filtersSlice.reducer;
