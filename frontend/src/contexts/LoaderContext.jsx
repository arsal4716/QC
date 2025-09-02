import { createContext, useState, useContext } from "react";

const LoaderContext = createContext();
let setLoadingFn;

export const LoaderProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  setLoadingFn = setLoading;

  return (
    <LoaderContext.Provider value={{ loading, setLoading }}>
      {children}
    </LoaderContext.Provider>
  );
};

export const useLoader = () => useContext(LoaderContext);

export const loaderController = {
  show: () => setLoadingFn && setLoadingFn(true),
  hide: () => setLoadingFn && setLoadingFn(false),
};
