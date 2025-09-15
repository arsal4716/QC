import React from 'react';

const Loader = ({ message = "Loading..." }) => (
  <div className="d-flex justify-content-center align-items-center py-5">
    <div className="spinner-border text-primary" role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
    {message && <span className="ms-2">{message}</span>}
  </div>
);

export default React.memo(Loader);