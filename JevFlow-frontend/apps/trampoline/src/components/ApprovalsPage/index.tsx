import React, { useState } from "react";
import { Box, Paper, Tabs, Tab, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { ApprovalRequestList } from "@vhrs/user-interfaces";

const TABS = ["pending", "approved", "declined", "all"] as const;

/** Approvals inbox built on the ApprovalRequest interface: status tabs filter
 *  client-side, clicking a row opens its review page. */
const ApprovalsPage: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<(typeof TABS)[number]>("pending");

  return (
    <Box sx={{ p: 3, maxWidth: 1000 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        Approvals
      </Typography>
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider", px: 1 }}>
          <Tabs value={tab} onChange={(_e, v) => setTab(v)}>
            {TABS.map((t) => (
              <Tab key={t} value={t} label={t[0].toUpperCase() + t.slice(1)} sx={{ textTransform: "none" }} />
            ))}
          </Tabs>
        </Box>
        <ApprovalRequestList
          key={tab}
          options={{ pageSize: 50, sortBy: ["-id"] }}
          itemFilter={tab === "all" ? undefined : (r: any) => r.status === tab}
          onRowClick={(row: any) => row.token && navigate(`/approvals/${row.token}/`)}
        />
      </Paper>
    </Box>
  );
};

export default ApprovalsPage;
