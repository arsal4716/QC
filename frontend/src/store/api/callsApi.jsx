import { baseApi } from './baseApi';

export const callsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getStats: builder.query({
      query: (params) => ({
        url: '/api/stats',
        params,
      }),
      providesTags: ['Stats'],
      transformResponse: (response) => response.data,
      keepUnusedDataFor: 60,
    }),

    getRecords: builder.query({
      query: (params) => ({
        url: '/api/calls/records',
        params: {
          page: 1,
          limit: 25,
          sortBy: 'callTimestamp',
          sortDir: 'desc',
          ...params,
        },
      }),
      providesTags: ['Records'],
      serializeQueryArgs: ({ queryArgs }) => {
        const { page, ...rest } = queryArgs || {};
        return JSON.stringify(rest);
      },
      merge: (currentCache, newItems, { arg }) => {
        if (arg.page === 1) {
          return newItems;
        }
        return {
          ...newItems,
          data: [...(currentCache?.data || []), ...newItems.data],
        };
      },
      forceRefetch: ({ currentArg, previousArg }) =>
        JSON.stringify(currentArg) !== JSON.stringify(previousArg),
    }),

    getCallDetail: builder.query({
      query: (id) => `/api/calls/records/${id}`,
      providesTags: (result, error, id) => [{ type: 'CallDetail', id }],
      transformResponse: (response) => response.data,
    }),

    exportRecords: builder.mutation({
      query: (params) => ({
        url: '/api/calls/export',
        params,
        responseHandler: (response) => response.blob(),
      }),
    }),

    bulkUpdateRecords: builder.mutation({
      query: (body) => ({
        url: '/api/calls/bulk-update',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Records', 'Stats'],
    }),
  }),
});


export const {
  useGetStatsQuery,
  useLazyGetStatsQuery,
  useGetRecordsQuery,
  useLazyGetRecordsQuery,
  useGetCallDetailQuery,
  useExportRecordsMutation,
  useBulkUpdateRecordsMutation,
} = callsApi;