import RecordsTable from '../../components/Table/RecordsTable';
import withPageFilters from '../../Layout/withPageFilters';

const CallLogs = ({ refreshKey, system }) => {
  return (
    <div className="mt-2">
      <RecordsTable refreshKey={refreshKey} system={system} />
    </div>
  );
};

export default withPageFilters(CallLogs);
