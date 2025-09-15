// src/store/slices/authSlice.js
import { createSlice } from "@reduxjs/toolkit";
import { authApi } from "../api/AuthApi";

const tokenFromStorage = (() => {
  try {
    return localStorage.getItem("token");
  } catch (e) {
    return null;
  }
})();

const initialState = {
  user: null,
  token: tokenFromStorage,
  isAuthenticated: !!tokenFromStorage,
  isLoading: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, token } = action.payload || {};
      state.user = user || null;
      state.token = token || null;
      state.isAuthenticated = !!token;
      try {
        if (token) localStorage.setItem("token", token);
      } catch (e) {
      }
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      try {
        localStorage.removeItem("token");
      } catch (e) {}
    },
    setLoading: (state, action) => {
      state.isLoading = !!action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(authApi.endpoints.login.matchPending, (state) => {
        state.isLoading = true;
      })
      .addMatcher(authApi.endpoints.login.matchFulfilled, (state, action) => {
        state.isLoading = false;
        const { user, token } = action.payload?.data || {};
        if (user && token) {
          authSlice.caseReducers.setCredentials(state, {
            payload: { user, token },
          });
        }
      })
      .addMatcher(authApi.endpoints.login.matchRejected, (state) => {
        state.isLoading = false;
      });
  },
});

export const { setCredentials, logout, setLoading } = authSlice.actions;
export default authSlice.reducer;

export const selectCurrentUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.isLoading;
export const selectAuthToken = (state) => state.auth.token;
