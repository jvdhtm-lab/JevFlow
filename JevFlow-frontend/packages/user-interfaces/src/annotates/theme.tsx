import React from "react";
import { Chip, Box } from "@mui/material";

export const colors = {
  primary: { main: "#0AA2A2", light: "#4DD0C8", dark: "#067A7A" },
  accent: { main: "#7C3AED", light: "#A78BFA", dark: "#5B21B6" },
  success: { main: "#16A34A", light: "#BBF7D0" },
  warning: { main: "#F59E0B", light: "#FDE68A" },
  error: { main: "#DC2626", light: "#FECACA" },
  info: { main: "#0284C7", light: "#BAE6FD" },
  fallback: "#666666",
};

export const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  activated: { color: colors.success.main, bg: colors.success.light, label: "Active" },
  deactivated: { color: colors.fallback, bg: "#eee", label: "Inactive" },
  pending: { color: colors.warning.main, bg: colors.warning.light, label: "Pending" },
  confirmed: { color: colors.info.main, bg: colors.info.light, label: "Confirmed" },
  archived: { color: colors.error.main, bg: colors.error.light, label: "Archived" },
};

export const INTEGRATION_STATUS_COLORS: Record<string, string> = {
  connected: colors.success.main,
  pending: colors.warning.main,
  disconnected: colors.error.main,
};

export const NODE_TYPE_COLORS: Record<string, string> = {
  trigger: colors.info.main,
  rule: colors.accent.main,
  classify: colors.primary.main,
  prioritize: colors.warning.main,
  decide: colors.success.main,
  action: colors.error.main,
};

export const RUN_STATUS_COLORS: Record<string, string> = {
  pending: colors.warning.main,
  decided: colors.success.main,
  escalated: colors.error.main,
  skipped: colors.fallback,
};

export const HOOK_DIRECTION_COLORS: Record<string, string> = {
  inbound: colors.info.main,
  outbound: colors.accent.main,
};

export const STATUS_CHIP_SX = { fontWeight: 600 };

export function renderStatusChip(cfg: { color: string; bg: string; label: string }, sx: any = {}) {
  return <Chip label={cfg.label} size="small" sx={{ color: cfg.color, bgcolor: cfg.bg, ...sx }} />;
}

export const ColorDot: React.FC<{ color: string; size?: number }> = ({ color, size = 10 }) => (
  <Box sx={{ width: size, height: size, borderRadius: "50%", bgcolor: color, display: "inline-block" }} />
);
