// store/api/baseApi.js
import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery, baseQueryWithReauth } from './baseQuery';
const baseQueryInstance = createBaseQuery();

const customBaseQuery = async (args, api, extraOptions) => {
  return baseQueryWithReauth(args, api, extraOptions, baseQueryInstance);
};

export const baseApi = createApi({
  reducerPath: 'api', 
  baseQuery: customBaseQuery,
  tagTypes: [
    'Stats',
    'Records',
    'CallDetail',
    'Campaigns',
    'Publishers',
    'Filters',
    'CostStats',
    'Payments',
    'CostBreakdown',
    'UserList',
    'User',
    'UserRoles',
    'UserSearch',
    'Dispositions',
    'Auth'
  ],
  endpoints: () => ({}),
  keepUnusedDataFor: 60,
  refetchOnMountOrArgChange: 30,
});