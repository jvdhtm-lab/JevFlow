import React from "react";
import { TextField, Switch, FormControlLabel, MenuItem } from "@mui/material";
import { annotateResource } from "@vhrs/resources";
import { People } from "@mui/icons-material";
import { commonAnnotations, defaultActions, relatedFieldAnnotation } from "./common";
import { colors, ColorDot } from "./theme";

const getUserColor = (data?: any) => (data?.is_active ? colors.success.main : colors.fallback);
const getUserIcon = (data?: any) => <People sx={{ color: getUserColor(data) }} />;

annotateResource("User", {
  fields: {
    ...commonAnnotations,
    email: { sortable: true, filterable: true },
    username: { sortable: true, filterable: true },
    first_name: { sortable: true, filterable: true },
    last_name: { sortable: true, filterable: true },
    auth_provider: {
      sortable: true,
      filterable: true,
      display: {
        components: {
          asFormInput: (value: any, ctx: any) => (
            <TextField
              select
              fullWidth
              size="small"
              margin="normal"
              label="Auth provider"
              value={value || "local"}
              onChange={(e) => ctx.set(e.target.value)}
              helperText="Where this user logs in from."
            >
              <MenuItem value="local">Local</MenuItem>
              <MenuItem value="google">Google</MenuItem>
              <MenuItem value="github">GitHub</MenuItem>
              <MenuItem value="x">X</MenuItem>
              <MenuItem value="outlook">Outlook</MenuItem>
              <MenuItem value="slack">Slack</MenuItem>
            </TextField>
          ),
        },
      },
    },
    account: {
      ...relatedFieldAnnotation("Account", "Account"),
      sortable: true,
      filterable: true,
    },
    password: {
      display: {
        components: {
          asFormInput: (value: any, ctx: any) => (
            <TextField
              fullWidth
              size="small"
              margin="normal"
              label="Password"
              type="password"
              value={value ?? ""}
              onChange={(e) => ctx.set(e.target.value)}
              helperText="Local logins only — social accounts use their provider."
            />
          ),
        },
      },
    },
    is_active: {
      display: {
        components: {
          asFormInput: (value: any, ctx: any) => (
            <FormControlLabel
              control={<Switch checked={!!value} onChange={(e) => ctx.set(e.target.checked)} />}
              label="Active"
              sx={{ mt: 1 }}
            />
          ),
        },
      },
    },
  },
  display: {
    components: {
      asTitle: () => <>Users</>,
      asIcon: getUserIcon,
      asColor: getUserColor,
      asListItem: (data: any) => (
        <span>
          <ColorDot color={getUserColor(data)} />{" "}
          {[data.first_name, data.last_name].filter(Boolean).join(" ") || data.username} · {data.email}
        </span>
      ),
    },
  },
  actions: defaultActions,
});
