import React, { memo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import BaseModal from "./BaseModal";
import { setSelectedTarget } from "../../store/slices/filtersSlice";

const TargetModal = memo(() => {
  const dispatch = useDispatch();
  const selectTaget = useSelector((state) => state.filters.selectTaget);

  const handleApply = useCallback(
    (selectedItems) => {
      dispatch(setSelectedTarget(selectedItems));
    },
    [dispatch]
  );

  return (
    <BaseModal
      modalType="target"
      title="Target"
        onApply={handleApply}
        initialSelection={selectTaget}
    />
  );
});

TargetModal.displayName = "TargetModal";

export default TargetModal;
