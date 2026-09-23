import React, { useState } from "react";
import { Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, AppBar, Toolbar, Typography, InputBase, IconButton, Menu, MenuItem } from "@mui/material";
import { Search as SearchIcon, Notifications as NotifIcon, AccountCircle } from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export interface MenuItemType {
  label: string;
  icon: React.ReactNode;
  path: string;
}

const Layout: React.FC<{ menuItems: MenuItemType[]; children: React.ReactNode }> = ({ menuItems, children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const handleLogout = async () => {
    setAnchor(null);
    try {
      await auth.logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };
  return (
    <Box sx={{ display: "flex" }}>
      <AppBar position="fixed" sx={{ zIndex: 1201 }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 0, mr: 3 }}>
            JevFlow
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", flexGrow: 1, bgcolor: "rgba(255,255,255,0.15)", borderRadius: 1, px: 1 }}>
            <SearchIcon fontSize="small" />
            <InputBase placeholder="Search…" sx={{ ml: 1, color: "inherit", width: "100%" }} />
          </Box>
          <IconButton color="inherit">
            <NotifIcon />
          </IconButton>
          <IconButton color="inherit" onClick={(e) => setAnchor(e.currentTarget)}>
            <AccountCircle />
          </IconButton>
          <Menu open={Boolean(anchor)} anchorEl={anchor} onClose={() => setAnchor(null)}>
            <MenuItem onClick={() => { setAnchor(null); navigate("/users"); }}>Profile</MenuItem>
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Drawer variant="permanent" sx={{ width: 220, "& .MuiDrawer-paper": { width: 220, mt: 8 } }}>
        <List>
          {menuItems.map((m) => (
            <ListItemButton key={m.path} selected={location.pathname.startsWith(m.path)} onClick={() => navigate(m.path)}>
              <ListItemIcon>{m.icon}</ListItemIcon>
              <ListItemText primary={m.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, mt: 8 }}>
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
