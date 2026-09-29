import React from "react";
import { Box, Tabs, Tab, Typography } from "@mui/material";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Person as ProfileIcon,
  Security as AccessIcon,
  Lock as LoginProvidersIcon,
} from "@mui/icons-material";

const TABS = [
  { label: "Profile", path: "/settings/profile", icon: <ProfileIcon fontSize="small" /> },
  { label: "Access", path: "/settings/access", icon: <AccessIcon fontSize="small" /> },
  { label: "Login Providers", path: "/settings/login-providers", icon: <LoginProvidersIcon fontSize="small" /> },
];

const SettingsLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = TABS.findIndex((t) => location.pathname.startsWith(t.path));

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        Settings
      </Typography>
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs
          value={activeTab >= 0 ? activeTab : 0}
          onChange={(_e, v) => navigate(TABS[v].path)}
          aria-label="Settings tabs"
        >
          {TABS.map((t) => (
            <Tab
              key={t.path}
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  {t.icon}
                  {t.label}
                </Box>
              }
            />
          ))}
        </Tabs>
      </Box>
      <Outlet />
    </Box>
  );
};

export default SettingsLayout;
