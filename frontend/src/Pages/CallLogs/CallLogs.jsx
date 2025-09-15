// src/pages/CallLogs/CallLogs.jsx
import React from 'react';
import RecordsTable from '../../components/Table/RecordsTable';
import withPageFilters from '../../Layout/withPageFilters';

const CallLogs = ({ refreshKey }) => {
  return (
    <div className="mt-2">
      <RecordsTable refreshKey={refreshKey} />
    </div>
  );
};

export default withPageFilters(CallLogs);