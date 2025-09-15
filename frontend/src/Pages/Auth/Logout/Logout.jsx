import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout } from '../../../store/slices/authSlice';
import { resetFilters } from '../../../store/slices/filtersSlice';
import { clearModalState } from '../../../store/slices/modalSlice';
import { useLogoutMutation } from '../../../store/api/authApi';
import Loader from '../../../components/Loader/Loader';

const Logout = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [logoutApi, { isLoading }] = useLogoutMutation();

  useEffect(() => {
    const performLogout = async () => {
      try {
        // Call API logout
        await logoutApi().unwrap();
        
        // Clear all Redux states
        dispatch(logout());
        dispatch(resetFilters());
        dispatch(clearModalState());
        
        // Clear local storage
        localStorage.removeItem('token');
        localStorage.removeItem('persist:root');
        
        // Redirect to login
        navigate('/login', { 
          replace: true,
          state: { message: 'You have been successfully logged out' }
        });
        
      } catch (error) {
        console.error('Logout error:', error);
        // Still clear local state even if API fails
        dispatch(logout());
        localStorage.removeItem('token');
        navigate('/login', { replace: true });
      }
    };

    performLogout();
  }, [navigate, dispatch, logoutApi]);

  if (isLoading) {
    return <Loader message="Logging out..." />;
  }

  return null;
};

export default React.memo(Logout);