// src/store/slices/uiSlice.js
import { createSlice } from "@reduxjs/toolkit";
import { createDefaultColumns } from "../../contexts/ColumnsContext";

const safeNormalize = (next) => {
  if (Array.isArray(next)) return next.filter(Boolean);
  if (next && typeof next === "object" && !Array.isArray(next)) {
    return Object.values(next).filter(Boolean);
  }
  return createDefaultColumns();
};

const initialState = {
  sidebarOpen: true,
  theme: "dark",
  autoRefresh: false,
  refreshInterval: 15000,
  notifications: [],
  columns: createDefaultColumns(),
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    setAutoRefresh: (state, action) => {
      state.autoRefresh = action.payload;
    },
    setRefreshInterval: (state, action) => {
      state.refreshInterval = Number(action.payload) || state.refreshInterval;
    },
    addNotification: (state, action) => {
      const payload = action.payload || {};
      state.notifications.push({ id: Date.now(), ...payload });
      if (state.notifications.length > 200) {
        state.notifications = state.notifications.slice(-200);
      }
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(
        (n) => n.id !== action.payload
      );
    },
    setColumns: (state, action) => {
      state.columns = safeNormalize(action.payload);
    },
    resetColumns: (state) => {
      state.columns = createDefaultColumns();
    },
  },
});

export const {
  toggleSidebar,
  setTheme,
  setAutoRefresh,
  setRefreshInterval,
  addNotification,
  removeNotification,
  setColumns,
  resetColumns,
} = uiSlice.actions;

export const selectUiColumns = (state) => safeNormalize(state?.ui?.columns);

export default uiSlice.reducer;
