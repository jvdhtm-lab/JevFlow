export const colors = {
  primary: { main: "#0AA2A2", light: "#4DD0C8", dark: "#067A7A" },
  accent: { main: "#7C3AED", light: "#A78BFA", dark: "#5B21B6" },
  success: { main: "#16A34A", light: "#BBF7D0" },
  warning: { main: "#F59E0B", light: "#FDE68A" },
  error: { main: "#DC2626", light: "#FECACA" },
  info: { main: "#0284C7", light: "#BAE6FD" },
  fallback: "#666666",
};

export const NODE_TYPE_COLORS: Record<string, string> = {
  trigger: "#0284C7",
  rule: "#7C3AED",
  classify: "#0AA2A2",
  prioritize: "#F59E0B",
  decide: "#16A34A",
  action: "#DC2626",
};

export const RUN_STATUS_COLORS: Record<string, string> = {
  pending: "#F59E0B",
  decided: "#16A34A",
  escalated: "#DC2626",
  skipped: "#666666",
};
