import React from 'react';
import withPageFilters from './withPageFilters';

const PageWithFilters = ({ children, filters, refreshKey, selectedCampaigns, selectedPublishers }) => {
  return typeof children === "function"
    ? children({ filters, refreshKey, selectedCampaigns, selectedPublishers })
    : React.cloneElement(children, { filters, refreshKey, selectedCampaigns, selectedPublishers });
};

export default withPageFilters(PageWithFilters);