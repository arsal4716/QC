import React from 'react';
import { Spinner } from 'react-bootstrap';

const LoadingSpinner = ({ size = 'md', variant = 'primary', text = 'Loading...' }) => {
  const spinnerSize = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : undefined;
  
  return (
    <div className="d-flex flex-column justify-content-center align-items-center p-4">
      <Spinner 
        animation="border" 
        variant={variant} 
        size={spinnerSize}
        className="mb-2"
      />
      {text && <span className="text-muted">{text}</span>}
    </div>
  );
};

export default LoadingSpinner;