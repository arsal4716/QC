import React, { createContext, useContext, useState, useEffect } from "react";
import { Spinner } from "react-bootstrap";
import { setAuthStorage, clearAuthStorage, getToken, getUser } from "../utils/auth";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const savedToken = getToken();
      const savedUser = getUser();

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(savedUser);
      }
    } catch (error) {
      console.error("Error initializing auth:", error);
      clearAuthStorage();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (newToken, userData) => {
    setAuthStorage(newToken, userData);
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    clearAuthStorage();
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedUserData) => {
    setAuthStorage(token, updatedUserData);
    setUser(updatedUserData);
  };

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated: !!(token && user),
    login,
    logout,
    updateUser,
  };

  if (isLoading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "100vh" }}
      >
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
