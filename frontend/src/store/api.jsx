// import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
// import { logout } from './slices/authSlice';

// const baseQuery = fetchBaseQuery({
//   baseUrl: process.env.REACT_APP_API_BASE || '',
//   credentials: 'include',
//   prepareHeaders: (headers, { getState }) => {
//     const token = getState().auth.token;
//     if (token) {
//       headers.set('authorization', `Bearer ${token}`);
//     }
//     return headers;
//   },
// });

// const baseQueryWithReauth = async (args, api, extraOptions) => {
//   let result = await baseQuery(args, api, extraOptions);
  
//   if (result?.error?.status === 401) {
//     api.dispatch(logout());
//   }
  
//   return result;
// };

// export const baseApi = createApi({
//   baseQuery: baseQueryWithReauth,
//   tagTypes: ['Stats', 'Records', 'CallDetail', 'Campaigns', 'Publishers', 'Filters'],
//   endpoints: () => ({}),
// });