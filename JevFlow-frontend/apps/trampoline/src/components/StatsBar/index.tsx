import React from "react";
import { Box, Paper, Tooltip, Typography } from "@mui/material";
import { Cable, AccountTree, PlayArrow, Warning } from "@mui/icons-material";

const Chip: React.FC<{ icon: React.ReactNode; label: string; title: string }> = ({ icon, label, title }) => (
  <Tooltip title={title}>
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 1.25, py: 0.5, borderRadius: 1.5, border: "1px solid", borderColor: "divider" }}>
      {icon}
      <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "0.75rem" }}>
        {label}
      </Typography>
    </Box>
  </Tooltip>
);

const StatsBar: React.FC = () => (
  <Paper sx={{ display: "flex", alignItems: "center", gap: 1, p: 1.5, flexWrap: "wrap" }}>
    <Chip icon={<Cable sx={{ fontSize: 14 }} />} label="3 integrations" title="Connected integrations" />
    <Chip icon={<AccountTree sx={{ fontSize: 14 }} />} label="1 map" title="Decision maps" />
    <Chip icon={<PlayArrow sx={{ fontSize: 14 }} />} label="15 runs today" title="Decision runs today" />
    <Chip icon={<Warning sx={{ fontSize: 14 }} />} label="2 escalations" title="Pending escalations" />
  </Paper>
);

export default StatsBar;
