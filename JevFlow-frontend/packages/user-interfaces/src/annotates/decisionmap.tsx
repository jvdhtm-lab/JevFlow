import React from "react";
import { annotateResource } from "@vhrs/resources";
import { AccountTree } from "@mui/icons-material";
import { commonAnnotations, defaultActions } from "./common";
import { colors } from "./theme";

const getColor = (data?: any) => (data?.status === "archived" ? colors.error.main : colors.primary.main);

annotateResource("DecisionMap", {
  fields: { ...commonAnnotations, name: { sortable: true, filterable: true } },
  display: {
    components: {
      asTitle: () => <>Decision Maps</>,
      asIcon: () => <AccountTree sx={{ color: colors.primary.main }} />,
      asColor: getColor,
    },
  },
  actions: defaultActions,
});
