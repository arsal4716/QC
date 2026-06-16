import React, { memo } from 'react';
import PropTypes from 'prop-types';

const sizeMap = {
  small: '1.5rem',
  medium: '2.5rem',
  large: '3.5rem',
};

const LoadingState = memo(({
  message = "Loading data...",
  size = "medium",
  fullScreen = false,
}) => {
  const dim = sizeMap[size] || sizeMap.medium;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '14px',
        minHeight: fullScreen ? '100vh' : '320px',
        width: '100%',
        backgroundColor: '#17233d',
        color: '#e9eefb',
      }}
    >
      <div
        className="spinner-border"
        role="status"
        style={{
          width: dim,
          height: dim,
          color: '#4dabf7',
          borderWidth: '0.28em',
        }}
      >
        <span className="visually-hidden">Loading...</span>
      </div>
      {message && (
        <p style={{ margin: 0, fontSize: '0.95rem', color: '#cdd6f4' }}>
          {message}
        </p>
      )}
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
