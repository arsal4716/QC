import React from 'react';
import { useSelector } from 'react-redux';
import CampaignModal from './CampaignModal';
import PublisherModal from './PublisherModal';
import BuyerModal from './BuyerModal';
import TargetModal from './TargetModal';
import DetailModal from "../Table/DetailModal";

const ModalManager = () => {
  const modals = useSelector((state) => state.modal.modals);
  const uiModals = useSelector((state) => state.ui.modals);

  return (
    <>
      {modals.campaign?.open && <CampaignModal />}
      {modals.publisher?.open && <PublisherModal />}
      {modals.buyer?.open && <BuyerModal />}
      {modals.target?.open && <TargetModal />}
      {uiModals.recordDetail && <DetailModal />}
    </>
  );
};

export default React.memo(ModalManager);
