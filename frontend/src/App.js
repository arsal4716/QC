import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "../src/Layout/DashboardLayout";
import Reporting from "../src/Pages/Reporting";
import CallLogs from "../src/Pages/CallLogs";
import Register from "../src/Pages/Register";
import Login from "../src/Pages/Login";
import Users from "../src/Pages/Users";
import CostDashboard from "../src/Pages/CostDashboard";
import { ColumnsProvider } from "../src/contexts/ColumnsContext";
import { AuthProvider, useAuth } from "../src/contexts/AuthContext";
import ProtectedRoute from "../src/contexts/ProtectedRoute";
import { ToastContainer } from "react-toastify";
import { LoaderProvider, useLoader } from "./contexts/LoaderContext";
import Loader from "./components/Loader";
import "./App.css";
const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  
  return user ? <Navigate to="/" replace /> : children;
};

function AppContent() {
  const { loading } = useLoader();

  return (
    <>
      {loading && <Loader />} 
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
          element={<Navigate to="/login" replace />}  
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

export default App;