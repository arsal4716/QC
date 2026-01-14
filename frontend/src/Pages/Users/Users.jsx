import React, { useState, useMemo } from "react";
import { toast } from "react-toastify";
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} from "../../store/api/userApi";
import UserModal from "../../components/Modal/UserModal";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";

const Users = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState({ page: 1, limit: 10 });
  const {
    data: usersResponse,
    isLoading,
    isError,
    refetch,
  } = useGetUsersQuery({
    page: pagination.page,
    limit: pagination.limit,
    search: searchTerm || undefined,
  });

  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();

  const users = usersResponse?.users || [];
  const totalCount = usersResponse?.totalCount || 0;
  const pageInfo = usersResponse?.pageInfo || { currentPage: 1, totalPages: 1 };

  const handleCreateUser = () => {
    setEditingUser(null);
    setShowModal(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowModal(true);
  };

  const handleSaveUser = async (userData) => {
    try {
      if (editingUser) {
        await updateUser({ id: editingUser._id, ...userData }).unwrap();
        toast.success("User updated successfully");
      } else {
        await createUser(userData).unwrap();
        toast.success("User created successfully");
      }
      setShowModal(false);
    } catch (error) {
      console.error("Failed to save user:", error);
      toast.error(error.data?.message || "Failed to save user");
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) {
      return;
    }

    try {
      await deleteUser(userId).unwrap();
      toast.success("User deleted successfully");
    } catch (error) {
      console.error("Failed to delete user:", error);
      toast.error(error.data?.message || "Failed to delete user");
    }
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const isLoadingState = isLoading || isCreating || isUpdating || isDeleting;

  if (isLoading && users.length === 0) {
    return (
      <div className="p-4">
        <LoadingState message="Loading users..." />
      </div>
    );
  }

  if (isError && users.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          type="default"
          title="Failed to load users"
          message="Please try again later"
          action={
            <button className="btn btn-primary" onClick={refetch}>
              Retry
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="text-white">User Management</h2>
        <button
          className="btn btn-primary"
          onClick={handleCreateUser}
          disabled={isLoadingState}
        >
          <i className="bi bi-plus-circle me-2"></i>Add User
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="row align-items-center">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search users by name, email, or role..."
                  value={searchTerm}
                  onChange={handleSearch}
                  disabled={isLoadingState}
                />
              </div>
            </div>
            <div className="col-md-6 text-end">
              <span className="badge bg-secondary">
                {totalCount.toLocaleString()} user(s) total
              </span>
              {searchTerm && (
                <span className="badge bg-info ms-2">
                  {users.length} filtered
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="card-body">
          {users.length === 0 ? (
            <EmptyState
              type={searchTerm ? "search" : "default"}
              title={searchTerm ? "No users found" : "No users available"}
              message={
                searchTerm
                  ? "Try adjusting your search terms"
                  : "Create your first user to get started"
              }
            />
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-striped table-hover">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user._id}>
                        <td>
                          <div className="d-flex align-items-center">
                            {user.avatar ? (
                              <img
                                src={user.avatar}
                                alt={user.name}
                                className="rounded-circle me-2"
                                width="32"
                                height="32"
                              />
                            ) : (
                              <div
                                className="bg-secondary rounded-circle d-flex align-items-center justify-content-center me-2"
                                style={{ width: "32px", height: "32px" }}
                              >
                                <i className="bi bi-person text-white"></i>
                              </div>
                            )}
                            <span>{user.name || "N/A"}</span>
                          </div>
                        </td>
                        <td>{user.email}</td>
                        <td>
                          <span
                            className={`badge ${
                              user.role === "admin" ? "bg-danger" : "bg-primary"
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              user.isActive ? "bg-success" : "bg-warning"
                            }`}
                          >
                            {user.active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>
                          <div className="btn-group">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => handleEditUser(user)}
                              disabled={isLoadingState}
                            >
                              <i className="bi bi-pencil"></i> Edit
                            </button>
                            {user.role !== "admin" && (
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDeleteUser(user._id)}
                                disabled={isLoadingState}
                              >
                                <i className="bi bi-trash"></i> Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pageInfo.totalPages > 1 && (
                <div className="d-flex justify-content-center mt-4">
                  <nav>
                    <ul className="pagination">
                      <li
                        className={`page-item ${
                          pagination.page === 1 ? "disabled" : ""
                        }`}
                      >
                        <button
                          className="page-link"
                          onClick={() => handlePageChange(pagination.page - 1)}
                          disabled={pagination.page === 1 || isLoadingState}
                        >
                          Previous
                        </button>
                      </li>

                      {Array.from(
                        { length: Math.min(5, pageInfo.totalPages) },
                        (_, i) => {
                          const pageNum = i + 1;
                          return (
                            <li
                              key={pageNum}
                              className={`page-item ${
                                pagination.page === pageNum ? "active" : ""
                              }`}
                            >
                              <button
                                className="page-link"
                                onClick={() => handlePageChange(pageNum)}
                                disabled={isLoadingState}
                              >
                                {pageNum}
                              </button>
                            </li>
                          );
                        }
                      )}

                      <li
                        className={`page-item ${
                          pagination.page === pageInfo.totalPages
                            ? "disabled"
                            : ""
                        }`}
                      >
                        <button
                          className="page-link"
                          onClick={() => handlePageChange(pagination.page + 1)}
                          disabled={
                            pagination.page === pageInfo.totalPages ||
                            isLoadingState
                          }
                        >
                          Next
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <UserModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveUser}
        user={editingUser}
        isLoading={isCreating || isUpdating}
      />
    </div>
  );
};

export default Users;
