import React, { useState } from "react";
import { Box, Typography, Tabs, Tab, Button, Drawer, IconButton, Paper, Chip } from "@mui/material";
import { Add as AddIcon, Close as CloseIcon } from "@mui/icons-material";
import { resources } from "@vhrs/resources";
import { useRItem, UserTable, UserList, UserForm } from "@vhrs/user-interfaces";
import { useAuth } from "../../context/AuthContext";

const CREATE_FIELDS = ['email', 'username', 'first_name', 'last_name', 'password', 'auth_provider', 'is_active'];

const UsersPage: React.FC = () => {
  const auth = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  // fetchOnDeclare: false — the table already fetches; this only reads the
  // shared cache for the count.
  const { total, fetchItems } = useRItem(resources.User, { fetchOnDeclare: false });

  const handleSaved = async () => {
    setCreateOpen(false);
    await fetchItems(true);
  };

  return (
    <Box p={3}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="h5" fontWeight={600}>Users</Typography>
          <Chip size="small" label={total} variant="outlined" />
        </Box>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
        >
          Add User
        </Button>
      </Box>

      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 1 }}>
          <Tabs value={tabValue} onChange={(_e, v) => setTabValue(v)}>
            <Tab label="Table" />
            <Tab label="List" />
          </Tabs>
        </Box>

        {tabValue === 0 && (
          <Box role="tabpanel">
            <UserTable key="user-table" auth={auth} />
          </Box>
        )}

        {tabValue === 1 && (
          <Box role="tabpanel">
            <UserList key="user-list" auth={auth} />
          </Box>
        )}
      </Paper>

      <Drawer
        anchor="right"
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: { xs: '100%', sm: 480 },
          },
        }}
      >
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Add User</Typography>
            <IconButton onClick={() => setCreateOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          <UserForm
            includeFields={CREATE_FIELDS}
            initialData={{ auth_provider: 'local', is_active: true, status: 'activated' }}
            auth={auth}
            onSave={handleSaved}
          />
        </Box>
      </Drawer>
    </Box>
  );
};

export default UsersPage;
