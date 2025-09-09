import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ColumnsProvider } from "../src/contexts/ColumnsContext";
import { AuthProvider, useAuth } from "../src/contexts/AuthContext";
import ProtectedRoute from "../src/contexts/ProtectedRoute";
import { ToastContainer } from "react-toastify";
import { LoaderProvider, useLoader } from "./contexts/LoaderContext";
import Loader from "./components/Loader";
import "./App.css";

// Lazy load components for better performance
const DashboardLayout = lazy(() => import("../src/Layout/DashboardLayout"));
const Reporting = lazy(() => import("../src/Pages/Reporting"));
const CallLogs = lazy(() => import("../src/Pages/CallLogs"));
const Register = lazy(() => import("../src/Pages/Register"));
const Login = lazy(() => import("../src/Pages/Login"));
const Users = lazy(() => import("../src/Pages/Users"));
const CostDashboard = lazy(() => import("../src/Pages/CostDashboard"));

const PublicRoute = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="min-vh-100 d-flex align-items-center justify-content-center">Loading...</div>; 
  return user ? <Navigate to="/reporting" replace /> : children;
};

// Loading component for Suspense fallback
const SuspenseFallback = () => (
  <div className="min-vh-100 d-flex align-items-center justify-content-center">
    <div className="spinner-border text-primary" role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
  </div>
);

function AppContent() {
  const { loading } = useLoader();
  const { user } = useAuth();

  return (
    <>
      {loading && <Loader />} 
      <Suspense fallback={<SuspenseFallback />}>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />
          <Route
            path="/"
            element={user ? <Navigate to="/reporting" replace /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/reporting"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Reporting />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/callLogs"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <CallLogs />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Users />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/cost"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <CostDashboard />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <ColumnsProvider>
        <LoaderProvider>
          <Router>
            <AppContent />
            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop={true}
              closeOnClick
              pauseOnHover
              draggable
              theme="colored" 
            />
          </Router>
        </LoaderProvider>
      </ColumnsProvider>
    </AuthProvider>
  );
}

export default React.memo(App);