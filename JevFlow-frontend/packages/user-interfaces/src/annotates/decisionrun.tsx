import React from "react";
import { annotateResource } from "@vhrs/resources";
import { PlayArrow } from "@mui/icons-material";
import { commonAnnotations, defaultActions } from "./common";
import { RUN_STATUS_COLORS, renderStatusChip } from "./theme";

const getColor = (data?: any) => (RUN_STATUS_COLORS as any)[data?.status] || "#666";

annotateResource("DecisionRun", {
  fields: {
    ...commonAnnotations,
    status: {
      sortable: true,
      filterable: true,
      display: {
        components: {
          asTableCell: (data: any) => renderStatusChip({ color: getColor({ status: data }), bg: "#f5f5f5", label: String(data) }),
        },
      },
    },
  },
  display: {
    components: { asTitle: () => <>Runs</>, asIcon: () => <PlayArrow />, asColor: getColor },
  },
  actions: defaultActions,
});
