import BaseSelectModal from "./BaseSelectModal";
import { getPublishers } from "../../api/filters";

export default function PublisherModal({ onApply, id = "publisherModal" }) {
  return (
    <BaseSelectModal
      id={id}
      title="Publishers"
      fetcher={getPublishers}
      onApply={onApply}
    />
  );
}
