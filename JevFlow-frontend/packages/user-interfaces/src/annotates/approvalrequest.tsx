import React from "react";
import { annotateResource } from "@vhrs/resources";
import { FactCheck } from "@mui/icons-material";
import { commonAnnotations, defaultActions, relatedFieldAnnotation, renderStatusChip } from "./common";
import { colors, ColorDot } from "./theme";

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  pending: { color: colors.warning.main, bg: colors.warning.light, label: "Pending" },
  approved: { color: colors.success.main, bg: colors.success.light, label: "Approved" },
  declined: { color: colors.error.main, bg: colors.error.light, label: "Declined" },
};

const getStatusColor = (data?: any) => STATUS_CONFIG[data?.status]?.color || colors.fallback;
const getIcon = () => <FactCheck sx={{ color: colors.primary.main }} />;

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
          <ColorDot color={getStatusColor(data)} /> {data.node_key} · {STATUS_CONFIG[data?.status]?.label || data.status}
        </span>
      ),
    },
  },
  actions: defaultActions,
});
