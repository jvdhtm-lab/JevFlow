import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { Box, Typography } from "@mui/material";
import {
  Dashboard as DashboardIcon,
  Cable as IntegrationsIcon,
  AccountTree as MapsIcon,
  PlayArrow as RunsIcon,
  Webhook as WebhooksIcon,
  FactCheck as ApprovalsIcon,
  Forum as ToolsIcon,
  People as UsersIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { theme } from "@vhrs/user-interfaces";
import { Login } from "@vhrs/user-interfaces";
import { DataCacheProvider } from "@vhrs/user-interfaces";
import { AuthProvider, useAuth } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import Layout, { MenuItemType } from "./components/Layout";
import { ResourcePage } from "@vhrs/user-interfaces";
import DecisionMapEditor from "./components/DecisionMapEditor";
import DecisionMapsList from "./components/DecisionMapsList";
import WorkflowRuns from "./components/WorkflowRuns";
import DashboardPage from "./components/DashboardPage";
import IntegrationsPage from "./components/IntegrationsPage";
import ApprovalReview from "./components/ApprovalReview";
import ApprovalsPage from "./components/ApprovalsPage";
import ToolsPage from "./components/ToolsPage";
import UsersPage from "./components/UsersPage";
import OAuthSettings from "./components/OAuthSettings";
import { resources } from "@vhrs/resources";

export const menuItems: MenuItemType[] = [
  { label: "Dashboard", icon: <DashboardIcon />, path: "/dashboard" },
  { label: "Integrations", icon: <IntegrationsIcon />, path: "/integrations" },
  { label: "Decision Maps", icon: <MapsIcon />, path: "/maps" },
  { label: "Runs", icon: <RunsIcon />, path: "/runs" },
  { label: "Approvals", icon: <ApprovalsIcon />, path: "/approvals" },
  { label: "Hooks", icon: <WebhooksIcon />, path: "/webhooks" },
  { label: "Tools", icon: <ToolsIcon />, path: "/tools" },
  { label: "Users", icon: <UsersIcon />, path: "/users" },
  { label: "Settings", icon: <SettingsIcon />, path: "/settings" },
];

const ResourceRoute: React.FC<{ resourceKey: keyof typeof resources }> = ({ resourceKey }) => {
  const auth = useAuth();
  const resource = (resources as any)[resourceKey];
  if (!resource)
    return (
      <Box p={3}>
        <Typography>Resource not found</Typography>
      </Box>
    );
  return <ResourcePage resource={resource} auth={auth} />;
};

const Dashboard: React.FC = () => <DashboardPage />;

const AppContent: React.FC = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (auth.isLoggedIn && window.location.pathname === "/login") navigate("/dashboard", { replace: true });
  }, [auth.isLoggedIn, navigate]);
  return (
    <Routes>
      <Route path="/login" element={<Login auth={auth} />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout menuItems={menuItems}>
              <Outlet />
            </Layout>
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="integrations" element={<IntegrationsPage />} />
        <Route path="maps" element={<DecisionMapsList />} />
        <Route path="maps/:id" element={<DecisionMapEditor />} />
        <Route path="runs" element={<WorkflowRuns />} />
        <Route path="approvals" element={<ApprovalsPage />} />
        <Route path="approvals/:token" element={<ApprovalReview />} />
        <Route path="webhooks" element={<ResourceRoute resourceKey="WebhookEndpoint" />} />
        <Route path="tools" element={<ToolsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="settings" element={<OAuthSettings />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
};

const App: React.FC = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <DataCacheProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </DataCacheProvider>
  </ThemeProvider>
);

export default App;
