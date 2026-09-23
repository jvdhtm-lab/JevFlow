import { annotateResource } from "@vhrs/resources";
import { defaultActions } from "./common";

annotateResource("_auth_", {
  fields: {
    email: { sortable: false, filterable: false },
    password: { sortable: false, filterable: false },
  },
  actions: defaultActions,
});
