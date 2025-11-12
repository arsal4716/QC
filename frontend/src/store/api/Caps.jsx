import { baseApi } from './baseApi';

export const capsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCaps: builder.query({
      query: () => '/api/caps',
      providesTags: ['Caps'],
    }),
    fetchCaps: builder.mutation({
      query: () => ({
        url: '/api/caps/fetch',
        method: 'POST',
      }),
      invalidatesTags: ['Caps'],
    }),
    updateTarget: builder.mutation({
      query: ({ id, target }) => ({
        url: `/api/caps/target/${id}`,
        method: 'PATCH',
        body: { target },
      }),
      invalidatesTags: ['Caps'], 
    }),
  }),
});

export const { useGetCapsQuery, useFetchCapsMutation, useUpdateTargetMutation } = capsApi;
