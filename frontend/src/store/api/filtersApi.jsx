import { baseApi } from "./baseApi";

export const filtersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCampaigns: builder.query({
      query: (params = {}) => ({
        url: "/api/filters/campaigns",
        params: { limit: 1000, ...params },
      }),
      transformResponse: (response) => response.data?.campaigns || [],
      providesTags: ["Campaigns"],
    }),

    getPublishers: builder.query({
      query: (params = {}) => ({
        url: "/api/filters/publishers",
        params: { limit: 1000, ...params },
      }),
      transformResponse: (response) => response.data?.publishers || [],
      providesTags: ["Publishers"],
    }),
    getTargets: builder.query({
      query: (params = {}) => ({
        url: "/api/filters/targets",
        params: { limit: 1000, ...params },
      }),
      transformResponse: (response) => response.data?.targets || [],
      providesTags: ["Targets"],
    }),
    getBuyers: builder.query({
      query: (params = {}) => ({
        url: "/api/filters/buyers",
        params: { limit: 1000, ...params },
      }),
      transformResponse: (response) => response.data?.buyers  || [],
      providesTags: ["Buyers"],
    }),

    getDispositions: builder.query({
      query: (params = {}) => ({
        url: "/api/filters/dispositions",
        params,
      }),
      transformResponse: (response) => response.data?.dispositions || [],
      providesTags: ["Dispositions"],
    }),

    getAllFilters: builder.query({
      query: (params = {}) => ({
        url: "/api/filters/all",
        params,
      }),
      transformResponse: (response) => response.data || {},
      providesTags: ["Filters"],
    }),
  }),

  overrideExisting: false,
});

export const {
  useGetCampaignsQuery,
  useLazyGetCampaignsQuery,
  useGetPublishersQuery,
  useLazyGetPublishersQuery,
  useGetTargetsQuery,
  useLazyGetTargetsQuery,
  useGetBuyersQuery,
  useLazyGetBuyersQuery,
  useGetDispositionsQuery,
  useLazyGetDispositionsQuery,
  useGetAllFiltersQuery,
} = filtersApi;
