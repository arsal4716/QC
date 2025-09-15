// App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';
import { AuthProvider } from './contexts/AuthContext';
import { ColumnsProvider } from './contexts/ColumnsContext';
import { LoaderProvider } from './contexts/LoaderContext';
import DashboardLayout from "./Layout/DashboardLayout";
import Reporting from "./Pages/Reporting/Reporting";
import CallLogs from "./Pages/CallLogs/CallLogs";
import Register from "./Pages/Register/Register";
import Login from "./Pages/Login/Login";
import Users from "./Pages/Users/Users";
import ProtectedRoute from "./components/Route/ProtectedRoute";
import PublicRoute from "./components/Route/PublicRoute";
import { ToastContainer } from "react-toastify";
import Loader from "./components/Loader/Loader";
import "./App.css";

function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={<Loader />} persistor={persistor}>
        <AuthProvider>
          <ColumnsProvider>
            <LoaderProvider>
              <Router>
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
                  <Route path="/" element={<Navigate to="/reporting" replace />} />
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
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
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
      </PersistGate>
    </Provider>
  );
}

export default App;