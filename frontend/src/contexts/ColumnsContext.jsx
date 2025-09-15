import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  memo,
  useMemo,
} from "react";
import PropTypes from "prop-types";

export const createDefaultColumns = () => [
  {
    key: "callTimestamp",
    label: "Time Stamp",
    visible: true,
    width: 150,
    sortable: true,
  },
  {
    key: "publisherName",
    label: "Publisher",
    visible: true,
    width: 120,
    sortable: true,
  },
  {
    key: "callerId",
    label: "CID",
    visible: true,
    width: 120,
    sortable: true,
  },
  { 
    key: "status",
    label: "Status", 
    visible: true, 
    width: 120, 
    sortable: true 
  },
  {
    key: "sub_disposition",  
    label: "Sub Disposition", 
    visible: true, 
    width: 120, 
    sortable: true 
  },
  {
    key: "durationSec",
    label: "Duration",
    visible: true,
    width: 100,
    sortable: true,
  },
  {
    key: "campaignName",
    label: "Campaign Name",
    visible: true,
    width: 150,
    sortable: true,
  },
  { 
    key: "reason", 
    label: "Reason", 
    visible: true, 
    width: 200, 
    truncate: true 
  },
  {
    key: "summary",
    label: "Summary",
    visible: true,
    width: 200,
    truncate: true,
  },
  {
    key: "transcript",
    label: "Transcript",
    visible: true,
    width: 200,
    truncate: true,
  },
  {
    key: "target_name",
    label: "Target",
    visible: true,
    width: 150,
  },
  { 
    key: "recordingUrl", 
    label: "Recording Link", 
    visible: true, 
    width: 120 
  },
  { 
    key: "systemCallId", 
    label: "System Call ID", 
    visible: true, 
    width: 120 
  },
  { 
    key: "systemBuyerId", 
    label: "Buyer", 
    visible: true, 
    width: 120 
  },
];



export const DEFAULT_COLUMNS = createDefaultColumns();


const columnReducer = (state, action) => {
  switch (action.type) {
    case "SET_COLUMNS": {
      const next = action.payload;
      if (Array.isArray(next)) return next.slice();
      if (next && typeof next === "object") return Object.values(next);
      return createDefaultColumns();
    }
    case "TOGGLE_COLUMN":
      return state.map((col) =>
        col.key === action.payload ? { ...col, visible: !col.visible } : col
      );
    case "UPDATE_COLUMN":
      return state.map((col) =>
        col.key === action.payload.key
          ? { ...col, ...action.payload.updates }
          : col
      );
    case "RESET_COLUMNS":
      return createDefaultColumns();
    case "REORDER_COLUMNS":
      return Array.isArray(action.payload) ? action.payload.slice() : state;
    default:
      return state;
  }
};
export const ColumnsContext = createContext();
export const ColumnsProvider = memo(({ children, initialColumns }) => {
  const safeInitial = useMemo(() => {
    if (Array.isArray(initialColumns) && initialColumns.length)
      return initialColumns.slice();
    if (initialColumns && typeof initialColumns === "object")
      return Object.values(initialColumns);
    return createDefaultColumns();
  }, [initialColumns]);

  const [columns, dispatch] = useReducer(columnReducer, safeInitial);

  const toggleColumn = useCallback(
    (key) => dispatch({ type: "TOGGLE_COLUMN", payload: key }),
    []
  );
  const updateColumn = useCallback(
    (key, updates) =>
      dispatch({ type: "UPDATE_COLUMN", payload: { key, updates } }),
    []
  );
  const resetColumns = useCallback(
    () => dispatch({ type: "RESET_COLUMNS" }),
    []
  );
  const setColumns = useCallback(
    (newColumns) => dispatch({ type: "SET_COLUMNS", payload: newColumns }),
    []
  );
  const reorderColumns = useCallback(
    (newOrder) => dispatch({ type: "REORDER_COLUMNS", payload: newOrder }),
    []
  );

  const value = useMemo(
    () => ({
      columns,
      toggleColumn,
      updateColumn,
      resetColumns,
      setColumns,
      reorderColumns,
    }),
    [
      columns,
      toggleColumn,
      updateColumn,
      resetColumns,
      setColumns,
      reorderColumns,
    ]
  );

  return (
    <ColumnsContext.Provider value={value}>{children}</ColumnsContext.Provider>
  );
});

ColumnsProvider.propTypes = {
  children: PropTypes.node.isRequired,
  initialColumns: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
};

export const useColumns = () => {
  const context = useContext(ColumnsContext);
  if (!context)
    throw new Error("useColumns must be used within a ColumnsProvider");
  return context;
};

export default ColumnsContext;
