import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Inbox, Search, Filter } from 'lucide-react';

const EmptyState = memo(({ 
  type = "default", 
  title, 
  message, 
  action,
  className = "" 
}) => {
  const getIcon = () => {
    switch (type) {
      case "search":
        return <Search size={48} />;
      case "filter":
        return <Filter size={48} />;
      default:
        return <Inbox size={48} />;
    }
  };

  const getDefaultTitle = () => {
    switch (type) {
      case "search":
        return "No results found";
      case "filter":
        return "No matching records";
      default:
        return "No data available";
    }
  };

  const getDefaultMessage = () => {
    switch (type) {
      case "search":
        return "Try adjusting your search terms or filters";
      case "filter":
        return "No records match your current filter criteria";
      default:
        return "There are no records to display at this time";
    }
  };

  return (
    <div className={`empty-state ${className}`}>
      <div className="empty-icon text-white">
        {getIcon()}
      </div>
      <div className="empty-content">
        <h3 className="empty-title text-white">{title || getDefaultTitle()}</h3>
        <p className="empty-message text-white">{message || getDefaultMessage()}</p>
        {action && (
          <div className="empty-action">
            {action}
          </div>
        )}
      </div>
    </div>
  );
});

EmptyState.propTypes = {
  type: PropTypes.oneOf(['default', 'search', 'filter']),
  title: PropTypes.string,
  message: PropTypes.string,
  action: PropTypes.node,
  className: PropTypes.string,
};

EmptyState.displayName = 'EmptyState';

export default EmptyState;