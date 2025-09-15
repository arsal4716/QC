import React from 'react';
import { useSelector } from 'react-redux';
import CampaignModal from './CampaignModal';
import PublisherModal from './PublisherModal';
import BuyerModal from './BuyerModal';
import TargetModal from './TargetModal';
import DetailModal from "../Table/DetailModal";

const ModalManager = () => {
  const modals = useSelector((state) => state.modal.modals);

  return (
    <>
      {modals.campaign?.open && <CampaignModal />}
      {modals.publisher?.open && <PublisherModal />}
      {modals.buyer?.open && <BuyerModal />}
      {modals.target?.open && <TargetModal />}
      {modals.recordDetail?.open && <DetailModal />}
    </>
  );
};

export default React.memo(ModalManager);
