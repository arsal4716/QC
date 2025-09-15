import React, { memo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import BaseModal from './BaseModal';
import { setSelectedBuyer } from '../../store/slices/filtersSlice';

const BuyerModal = memo(() => {
  const dispatch = useDispatch();
  const selectedBuyers = useSelector((state) => state.filters.selectedBuyers);

  const handleApply = useCallback((selectedItems) => {
    dispatch(setSelectedBuyer(selectedItems));
  }, [dispatch]);

  return (
    <BaseModal
      modalType="buyer"
      title="Buyers"
      onApply={handleApply}
      initialSelection={selectedBuyers}
    />
  );
});

BuyerModal.displayName = 'BuyerModal';

export default BuyerModal;
