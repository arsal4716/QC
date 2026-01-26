import React, { memo } from "react";

const statusConfig = {
  Sales: { variant: "success", icon: "bi-currency-dollar" },
  "Not Interested": { variant: "warning", icon: "bi-x-circle" },
  "Not Qualified": { variant: "secondary", icon: "bi-slash-circle" },
  DNC: { variant: "danger", icon: "bi-telephone-x" },
  Voicemail: { variant: "info", icon: "bi-mic" },
  "Tech Issues": { variant: "danger", icon: "bi-wrench" },
  DWSPI: { variant: "secondary", icon: "bi-shield-exclamation" },
  Unresponsive: { variant: "warning", icon: "bi-volume-mute" },
  Hungup: { variant: "danger", icon: "bi-telephone-minus" },
  Callback: { variant: "primary", icon: "bi-telephone-plus" },
  IVR: { variant: "info", icon: "bi-robot" },
  "subsidy/incentivised": { variant: "success", icon: "bi-award" },
  "Language Barrier": { variant: "warning", icon: "bi-translate" },
  Misdialed: { variant: "secondary", icon: "bi-telephone-outbound" },
  income: { variant: "secondary", icon: "bi-telephone-outbound" },
  default: { variant: "light", icon: "bi-question-circle" },
};
const textColorMap = {
  primary: "white",
  secondary: "white",
  success: "white",
  danger: "white",
  warning: "black",
  info: "white",
  light: "black",
  dark: "white",
};

const StatusBadge = memo(({ status, showIcon = true, size = "sm" }) => {
  if (!status || typeof status !== "string") return null;

  const config = statusConfig[status] || statusConfig.default;
  const textColor = textColorMap[config.variant] || "white";

  return (
    <span
      className={`badge bg-${config.variant} ${size === "lg" ? "badge-lg" : ""}`}
      style={{ color: textColor }}
    >
      {showIcon && <i className={`bi ${config.icon} me-1`} />}
      {status}
    </span>
  );
});

StatusBadge.displayName = "StatusBadge";
export default StatusBadge;
