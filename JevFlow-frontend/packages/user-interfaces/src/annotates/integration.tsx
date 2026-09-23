import React from "react";
import { annotateResource } from "@vhrs/resources";
import { Cable } from "@mui/icons-material";
import { commonAnnotations, defaultActions } from "./common";
import { INTEGRATION_STATUS_COLORS, ColorDot } from "./theme";

const getColor = (data?: any) => (INTEGRATION_STATUS_COLORS as any)[data?.status] || "#666";

annotateResource("Integration", {
  fields: { ...commonAnnotations, provider: { sortable: true, filterable: true } },
  display: {
    components: {
      asTitle: () => <>Integrations</>,
      asIcon: () => <Cable />,
      asColor: getColor,
      asListItem: (data: any) => (
        <span>
          <ColorDot color={getColor(data)} /> {data.provider} · {data.status}
        </span>
      ),
    },
  },
  actions: defaultActions,
});
