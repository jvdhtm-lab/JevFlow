import React from "react";
import { Box, MenuItem, TextField } from "@mui/material";
import { annotateResource } from "@vhrs/resources";
import { Mail, Message } from "@mui/icons-material";
import RelatedFieldInput from "../components/Dynamics/RelatedFieldInput";
import { commonAnnotations, defaultActions } from "./common";
import { colors, ColorDot } from "./theme";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  message: <Message sx={{ fontSize: 16 }} />,
  email: <Mail sx={{ fontSize: 16 }} />,
};

const getToolColor = (_data?: any) => colors.accent.main;
const getToolIcon = (data?: any) => <Box sx={{ color: colors.accent.main, display: "flex" }}>{TYPE_ICONS[data?.tool_type] || <Message sx={{ fontSize: 16 }} />}</Box>;

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
              label="Type"
              value={value || "message"}
              onChange={(e) => ctx.set(e.target.value)}
              helperText="Message = channel post; Email = email with the approve/decline link."
            >
              <MenuItem value="message">Message — channel post</MenuItem>
              <MenuItem value="email">Email — approve/decline link</MenuItem>
            </TextField>
          ),
          asTableCell: (data: any) => <span>{data === "email" ? "Email" : "Message"}</span>,
        },
      },
    },
    via: {
      sortable: true,
      filterable: true,
      display: {
        components: {
          asFormInput: (value: any, ctx: any) => {
            const v = value || "integration";
            return (
              <TextField
                select
                fullWidth
                size="small"
                label="Send via"
                value={v}
                onChange={(e) => {
                  const next = e.target.value;
                  ctx.set(next);
                  // Clear the FK that no longer applies
                  if (next === "integration") ctx.setField("webhook_endpoint", undefined);
                  else ctx.setField("integration", undefined);
                }}
                helperText="Integration = use the integration's credentials; Outbound hook = reuse a defined hook."
              >
                <MenuItem value="integration">Integration — credentials</MenuItem>
                <MenuItem value="hook">Outbound hook — reuse URL + auth</MenuItem>
              </TextField>
            );
          },
          asTableCell: (data: any) => <span>{data === "hook" ? "Outbound hook" : "Integration"}</span>,
        },
      },
    },
    integration: {
      sortable: true,
      filterable: true,
      display: {
        components: {
          asFormInput: (value: any, ctx: any) => {
            if (ctx.form?.via !== "integration") return null;
            return (
              <RelatedFieldInput
                fieldName="integration"
                field={ctx.field}
                value={value}
                onChange={(v: any) => ctx.set(v)}
                label="Integration"
              />
            );
          },
        },
      },
    },
    webhook_endpoint: {
      sortable: true,
      filterable: true,
      display: {
        components: {
          asFormInput: (value: any, ctx: any) => {
            if (ctx.form?.via !== "hook") return null;
            return (
              <RelatedFieldInput
                fieldName="webhook_endpoint"
                field={ctx.field}
                value={value}
                onChange={(v: any) => ctx.set(v)}
                label="Outbound hook"
              />
            );
          },
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
          <ColorDot color={getToolColor(data)} /> {data?.tool_type === "email" ? "Email" : "Message"} · {data?.via === "hook" ? "hook" : "integration"}
        </span>
      ),
    },
  },
  actions: defaultActions,
});
