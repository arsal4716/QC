// contexts/LoaderContext.js
import React, { createContext, useContext, useState, useCallback } from "react";

const LoaderContext = createContext();

export const LoaderProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);

  const show = useCallback(() => setLoading(true), []);
  const hide = useCallback(() => setLoading(false), []);

  const value = {
    loading,
    show,
    hide
  };

  return (
    <LoaderContext.Provider value={value}>
      {children}
    </LoaderContext.Provider>
  );
};

export const useLoader = () => {
  const context = useContext(LoaderContext);
  if (!context) {
    throw new Error('useLoader must be used within a LoaderProvider');
  }
  return context;
};

