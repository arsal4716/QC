import React, { memo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import BaseModal from "./BaseModal";
import { setSelectedCampaigns } from "../../store/slices/filtersSlice";

const CampaignModal = memo(() => {
  const dispatch = useDispatch();
  const selectedCampaigns = useSelector(
    (state) => state.filters.selectedCampaigns
  );

  const handleApply = useCallback(
    (selectedItems) => {
      dispatch(setSelectedCampaigns(selectedItems));
    },
    [dispatch]
  );

  return (
    <BaseModal
      modalType="campaign"
      title="Campaigns"
      onApply={handleApply}
      initialSelection={selectedCampaigns}
    />
  );
});

CampaignModal.displayName = "CampaignModal";

export default CampaignModal;
