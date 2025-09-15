import { baseApi } from './baseApi';

export const userApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all users with pagination and filtering
    getUsers: builder.query({
      query: (params = {}) => ({
        url: '/api/users',
        params: {
          limit: 50,
          ...params,
        },
      }),
      transformResponse: (response) => ({
        users: response.users || response.data || [],
        totalCount: response.totalCount || response.total || 0,
        pageInfo: response.pageInfo || {
          currentPage: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.users.map(({ id }) => ({ type: 'User', id })),
              'UserList',
            ]
          : ['UserList'],
    }),

    // Get user by ID
    getUserById: builder.query({
      query: (id) => ({
        url: `/api/users/${id}`,
      }),
      transformResponse: (response) => response.user || response.data,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),

    // Create a new user
    createUser: builder.mutation({
      query: (userData) => ({
        url: '/api/users',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['UserList'],
    }),

    // Update user by ID
    updateUser: builder.mutation({
      query: ({ id, ...userData }) => ({
        url: `/api/users/${id}`,
        method: 'PUT',
        body: userData,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'User', id },
        'UserList',
      ],
    }),

    // Delete user by ID
    deleteUser: builder.mutation({
      query: (id) => ({
        url: `/api/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['UserList'],
    }),

    // Bulk user operations
    bulkUpdateUsers: builder.mutation({
      query: (userUpdates) => ({
        url: '/api/users/bulk',
        method: 'PATCH',
        body: userUpdates,
      }),
      invalidatesTags: ['UserList'],
    }),

    // Get user roles and permissions
    getUserRoles: builder.query({
      query: () => ({
        url: '/api/users/roles',
      }),
      transformResponse: (response) => response.roles || response.data || [],
      providesTags: ['UserRoles'],
    }),

    // Update user role
    updateUserRole: builder.mutation({
      query: ({ userId, role }) => ({
        url: `/api/users/${userId}/role`,
        method: 'PATCH',
        body: { role },
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: 'User', userId },
        'UserList',
        'UserRoles',
      ],
    }),

    // Search users
    searchUsers: builder.query({
      query: (searchParams) => ({
        url: '/api/users/search',
        params: searchParams,
      }),
      transformResponse: (response) => response.users || response.data || [],
      providesTags: (result) =>
        result
          ? result.map(({ id }) => ({ type: 'User', id }))
          : ['UserSearch'],
    }),
  }),

  overrideExisting: false,
});

export const {
  useGetUsersQuery,
  useLazyGetUsersQuery,
  useGetUserByIdQuery,
  useLazyGetUserByIdQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useBulkUpdateUsersMutation,
  useGetUserRolesQuery,
  useLazyGetUserRolesQuery,
  useUpdateUserRoleMutation,
  useSearchUsersQuery,
  useLazySearchUsersQuery,
} = userApi;