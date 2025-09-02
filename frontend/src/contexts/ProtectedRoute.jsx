import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LoadingSpinner from "../components/LoadingSpinner";

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;