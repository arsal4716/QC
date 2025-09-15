// store/api/AuthApi.js
import { baseApi } from './baseApi';

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: '/api/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Auth'],
    }),

    register: builder.mutation({
      query: (userData) => ({
        url: '/api/auth/register',
        method: 'POST',
        body: userData,
      }),
    }),

    getProfile: builder.query({
      query: () => '/api/auth/profile',
      providesTags: ['Auth'],
    }),

    logout: builder.mutation({
      query: () => ({
        url: '/api/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['Auth'],
    }),

    refreshToken: builder.mutation({
      query: () => ({
        url: '/api/auth/refresh',
        method: 'POST',
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetProfileQuery,
  useLazyGetProfileQuery,
  useLogoutMutation,
  useRefreshTokenMutation,
} = authApi;