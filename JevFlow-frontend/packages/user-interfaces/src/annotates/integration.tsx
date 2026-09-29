import React from "react";
import { annotateResource } from "@vhrs/resources";
import { Cable } from "@mui/icons-material";
import { commonAnnotations, defaultActions, jsonFieldAnnotation } from "./common";
import { INTEGRATION_STATUS_COLORS, ColorDot } from "./theme";

const getColor = (data?: any) => (INTEGRATION_STATUS_COLORS as any)[data?.connection_status] || "#666";

annotateResource("Integration", {
  fields: {
    ...commonAnnotations,
    name: { sortable: true, filterable: true },
    integration_type: { sortable: true, filterable: true },
    purpose: { sortable: true, filterable: true },
    connection_status: { sortable: true, filterable: true },
    config: {
      ...jsonFieldAnnotation("Config (JSON)", "Provider settings object — must stay valid JSON."),
    },
  },
  display: {
    components: {
      asTitle: () => <>Integrations</>,
      asIcon: () => <Cable />,
      asColor: getColor,
      asListItem: (data: any) => (
        <span>
          <ColorDot color={getColor(data)} /> {data?.name} · {data?.integration_type}
        </span>
      ),
    },
  },
  actions: defaultActions,
});
