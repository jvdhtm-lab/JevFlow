import React from "react";
import { TextField, Switch, FormControlLabel, MenuItem } from "@mui/material";
import { annotateResource } from "@vhrs/resources";
import { Webhook } from "@mui/icons-material";
import { commonAnnotations, defaultActions, relatedFieldAnnotation } from "./common";
import { HOOK_DIRECTION_COLORS, ColorDot, colors } from "./theme";

const getHookColor = (data?: any) => HOOK_DIRECTION_COLORS[data?.direction] || colors.fallback;
const getHookIcon = (data?: any) => <Webhook sx={{ color: getHookColor(data) }} />;

const passwordField = (label: string, helper: string) => (value: any, ctx: any) => (
  <TextField
    fullWidth
    size="small"
    margin="normal"
    label={label}
    type="password"
    value={value ?? ""}
    onChange={(e) => ctx.set(e.target.value)}
    helperText={helper}
  />
);

const helperField = (label: string, helper: string) => (value: any, ctx: any) => (
  <TextField
    fullWidth
    size="small"
    margin="normal"
    label={label}
    value={value ?? ""}
    onChange={(e) => ctx.set(e.target.value)}
    helperText={helper}
  />
);

annotateResource("WebhookEndpoint", {
  fields: {
    ...commonAnnotations,
    integration: {
      ...relatedFieldAnnotation("Integration", "Integration"),
      sortable: true,
      filterable: true,
    },
    direction: {
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
              label="Direction"
              value={value || ""}
              onChange={(e) => ctx.set(e.target.value)}
              helperText="Inbound: they post to us on the fixed hook URL. Outbound: we post to them."
            >
              <MenuItem value="inbound">Inbound — receives</MenuItem>
              <MenuItem value="outbound">Outbound — posts</MenuItem>
            </TextField>
          ),
        },
      },
    },
    source: {
      sortable: true,
      filterable: true,
    },
    target_url: {
      title: "Target URL",
      display: {
        components: {
          asFormInput: helperField("Target URL", "Outbound only. Full customer URL we POST to."),
        },
      },
    },
    auth_scheme: {
      title: "Auth scheme",
      display: {
        components: {
          asFormInput: (value: any, ctx: any) => (
            <TextField
              select
              fullWidth
              size="small"
              margin="normal"
              label="Auth scheme"
              value={value || "none"}
              onChange={(e) => ctx.set(e.target.value)}
              helperText="How we authenticate to the customer on outbound posts."
            >
              <MenuItem value="none">None</MenuItem>
              <MenuItem value="bearer">Bearer token</MenuItem>
              <MenuItem value="basic">Basic auth</MenuItem>
            </TextField>
          ),
        },
      },
    },
    auth_username: {
      title: "Auth username",
      display: {
        components: {
          asFormInput: helperField("Auth username", "Basic auth only."),
        },
      },
    },
    auth_token: {
      title: "Auth token",
      display: {
        components: {
          asFormInput: passwordField(
            "Auth token",
            "Customer-provided credential. Stored, never displayed back."
          ),
        },
      },
    },
    secret: {
      display: {
        components: {
          asFormInput: passwordField(
            "Secret",
            "Inbound only. Leave blank to auto-generate — hand it to the customer with the fixed hook URL."
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
      asTitle: () => <>Hooks</>,
      asIcon: getHookIcon,
      asColor: getHookColor,
      asListItem: (data: any) => (
        <span>
          <ColorDot color={getHookColor(data)} /> {data.direction} · {data.source} ·{" "}
          {data.integration_name || `integration ${data.integration}`}
        </span>
      ),
    },
  },
  actions: defaultActions,
});
