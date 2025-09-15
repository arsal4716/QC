import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Loader2 } from 'lucide-react';

const LoadingState = memo(({ 
  message = "Loading data...", 
  size = "medium",
  fullScreen = false 
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  return (
    <div className={`loading-state ${fullScreen ? 'full-screen' : ''}`}>
      <div className="loading-content">
        <Loader2 className={`animate-spin ${sizeClasses[size]}`} />
        <p className="loading-message">{message}</p>
      </div>
    </div>
  );
});

LoadingState.propTypes = {
  message: PropTypes.string,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  fullScreen: PropTypes.bool,
};

LoadingState.displayName = 'LoadingState';

export default LoadingState;