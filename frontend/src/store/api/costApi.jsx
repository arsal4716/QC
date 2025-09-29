import { baseApi } from './baseApi';

export const costApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCostStats: builder.query({
      query: (params = {}) => ({
        url: '/api/cost/stats',
        params,
      }),
      transformResponse: (response) => response.data || response,
      providesTags: ['CostStats'],
    }),

    getPaymentHistory: builder.query({
      query: (params = {}) => ({
        url: '/api/cost/payments',
        params: {
          limit: 100,
          ...params,
        },
      }),
      transformResponse: (response) => response.payments || response.data || [],
      providesTags: ['Payments'],
    }),

    createPayment: builder.mutation({
      query: (paymentData) => ({
        url: '/api/cost/payments',
        method: 'POST',
        body: paymentData,
      }),
      invalidatesTags: ['Payments', 'CostStats'],
    }),
    
    updatePayment: builder.mutation({
      query: ({ id, ...paymentData }) => ({
        url: `/api/cost/payments/${id}`,
        method: 'PUT',
        body: paymentData,
      }),
      invalidatesTags: ['Payments', 'CostStats'],
    }),

    deletePayment: builder.mutation({
      query: (id) => ({
        url: `/api/cost/payments/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Payments', 'CostStats'],
    }),

    // Get cost breakdown by category
    getCostBreakdown: builder.query({
      query: (params = {}) => ({
        url: '/api/cost/breakdown',
        params,
      }),
      transformResponse: (response) => response.breakdown || response.data || [],
      providesTags: ['CostBreakdown'],
    }),

    exportCostData: builder.mutation({
      query: (exportParams) => ({
        url: '/api/cost/export',
        method: 'POST',
        body: exportParams,
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),

  overrideExisting: false,
});

export const {
  useGetCostStatsQuery,
  useLazyGetCostStatsQuery,
  useGetPaymentHistoryQuery,
  useLazyGetPaymentHistoryQuery,
  useCreatePaymentMutation,
  useUpdatePaymentMutation,
  useDeletePaymentMutation,
  useGetCostBreakdownQuery,
  useLazyGetCostBreakdownQuery,
  useExportCostDataMutation,
} = costApi;