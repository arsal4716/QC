// store/api/baseQuery.js
import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const createBaseQuery = (baseUrl = '') => {
  return fetchBaseQuery({
    baseUrl: baseUrl || process.env.REACT_APP_API_BASE || '',
    credentials: 'include',
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      headers.set('accept', 'application/json');
      headers.set('content-type', 'application/json');
      return headers;
    },
  });
};

export const baseQueryWithReauth = async (args, api, extraOptions, baseQuery) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result?.error?.status === 401) {
    try {
      const { logout } = await import('../slices/authSlice');
      api.dispatch(logout());
    } catch (error) {
      console.error('Failed to import authSlice:', error);
    }
  }
  if (result?.error) {
    result.error.message =
      result.error.data?.message ||
      result.error.error ||
      result.error.statusText ||
      'Unknown error occurred';
  }

  return result;
};
