// src/store/api/twilioCalls.js
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const twilioCallsApi = createApi({
  reducerPath: 'twilioCallsApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/twilioCalls' }),
  tagTypes: ['Calls'],
  endpoints: (builder) => ({
    getCalls: builder.query({
      query: () => '/',
      providesTags: ['Calls'],
    }),
  }),
});

export const { useGetCallsQuery } = twilioCallsApi;
