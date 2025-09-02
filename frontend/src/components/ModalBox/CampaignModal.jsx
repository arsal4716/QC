import BaseSelectModal from "./BaseSelectModal";
import { getCampaigns } from "../../api/filters";

export default function CampaignModal({ onApply, id = "campaignModal" }) {
  return (
    <BaseSelectModal
      id={id}
      title="Campaigns"
      fetcher={getCampaigns}
      onApply={onApply}
      
    />
  );
}
