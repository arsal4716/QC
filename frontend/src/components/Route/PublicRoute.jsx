import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { selectIsAuthenticated, selectAuthLoading } from '../../store/slices/authSlice';
import Loader from '../Loader/Loader';

const PublicRoute = ({ children, restricted = false }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectAuthLoading);
  const location = useLocation();

  if (isLoading) {
    return <Loader />;
  }

  if (isAuthenticated && restricted) {
    const from = location.state?.from?.pathname || '/reporting';
    return <Navigate to={from} replace />;
  }

  return children;
};

export default React.memo(PublicRoute);