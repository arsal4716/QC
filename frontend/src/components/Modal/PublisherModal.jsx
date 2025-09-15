import React, { memo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import BaseModal from './BaseModal';
import { setSelectedPublishers } from '../../store/slices/filtersSlice';

const PublisherModal = memo(() => {
  const dispatch = useDispatch();
  const selectedPublishers = useSelector((state) => state.filters.selectedPublishers);

  const handleApply = useCallback((selectedItems) => {
    dispatch(setSelectedPublishers(selectedItems));
  }, [dispatch]);

  return (
    <BaseModal
      modalType="publisher"
      title="Publishers"
      onApply={handleApply}
      initialSelection={selectedPublishers}
    />
  );
});

PublisherModal.displayName = 'PublisherModal';

export default PublisherModal;
