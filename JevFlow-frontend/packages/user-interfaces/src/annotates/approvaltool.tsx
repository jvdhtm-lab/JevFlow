import React from "react";
import { TextField, Switch, FormControlLabel, MenuItem } from "@mui/material";
import { annotateResource } from "@vhrs/resources";
import { MarkEmailRead } from "@mui/icons-material";
import { commonAnnotations, defaultActions } from "./common";
import { colors, ColorDot } from "./theme";

const TOOL_LABELS: Record<string, string> = {
  smtp_email: "SMTP Email",
  slack_channel: "Slack Channel",
  teams: "Teams",
  whatsapp: "WhatsApp",
};

const getToolColor = () => colors.accent.main;
const getToolIcon = () => <MarkEmailRead sx={{ color: colors.accent.main }} />;

annotateResource("ApprovalTool", {
  fields: {
    ...commonAnnotations,
    tool_type: {
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
              label="Tool type"
              value={value || ""}
              onChange={(e) => ctx.set(e.target.value)}
              helperText="Channel the human is notified on."
            >
              {Object.entries(TOOL_LABELS).map(([v, label]) => (
                <MenuItem key={v} value={v}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
          ),
          asTableCell: (data: any) => <span>{TOOL_LABELS[data] || String(data ?? "")}</span>,
        },
      },
    },
    target: {
      sortable: true,
      filterable: true,
      display: {
        components: {
          asFormInput: (value: any, ctx: any) => (
            <TextField
              fullWidth
              size="small"
              margin="normal"
              label="Target"
              value={value ?? ""}
              onChange={(e) => ctx.set(e.target.value)}
              helperText="Customer-provided: email address, channel webhook URL or phone number."
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
      asTitle: () => <>Approval tools</>,
      asIcon: getToolIcon,
      asColor: getToolColor,
      asListItem: (data: any) => (
        <span>
          <ColorDot color={getToolColor(data)} /> {TOOL_LABELS[data.tool_type] || data.tool_type} · {data.target}
        </span>
      ),
    },
  },
  actions: defaultActions,
});
