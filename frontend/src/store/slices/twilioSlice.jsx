// src/store/slices/twilioSlice.jsx
import { createSlice } from '@reduxjs/toolkit';
import { twilioCallsApi } from '../api/twilioCalls';

const initialState = {
  selectedCall: null,
};

const twilioSlice = createSlice({
  name: 'twilio',
  initialState,
  reducers: {
    setSelectedCall: (state, action) => {
      state.selectedCall = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(
      twilioCallsApi.endpoints.getCalls.matchFulfilled,
      (state, action) => {
        state.calls = action.payload;
      }
    );
  },
});

export const { setSelectedCall } = twilioSlice.actions;
export default twilioSlice.reducer;
