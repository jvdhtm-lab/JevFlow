import React from "react";
import { annotateResource } from "@vhrs/resources";
import { FactCheck } from "@mui/icons-material";
import { commonAnnotations, defaultActions, relatedFieldAnnotation } from "./common";
import { colors, ColorDot, renderStatusChip } from "./theme";

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  pending: { color: colors.warning.main, bg: colors.warning.light, label: "Pending" },
  approved: { color: colors.success.main, bg: colors.success.light, label: "Approved" },
  declined: { color: colors.error.main, bg: colors.error.light, label: "Declined" },
};

const getStatusColor = (data?: any) => STATUS_CONFIG[data?.status]?.color || colors.fallback;
const getIcon = () => <FactCheck sx={{ color: colors.primary.main }} />;

const timeAgo = (iso?: string) => {
  if (!iso) return "";
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

annotateResource("ApprovalRequest", {
  fields: {
    ...commonAnnotations,
    map: {
      ...relatedFieldAnnotation("DecisionMap", "Map"),
      sortable: true,
      filterable: true,
    },
    status: {
      sortable: true,
      filterable: true,
      display: {
        components: {
          asTableCell: (data: any) => {
            const cfg = STATUS_CONFIG[data];
            return cfg ? renderStatusChip(cfg) : <span>{String(data ?? "")}</span>;
          },
        },
      },
    },
  },
  display: {
    components: {
      asTitle: () => <>Approval requests</>,
      asIcon: getIcon,
      asColor: getStatusColor,
      asListItem: (data: any) => (
        <span>
          <ColorDot color={getStatusColor(data)} />{" "}
          {data.summary || `${data.node_key} · ${STATUS_CONFIG[data?.status]?.label || data.status}`}
        </span>
      ),
    },
  },
  actions: defaultActions,
});
