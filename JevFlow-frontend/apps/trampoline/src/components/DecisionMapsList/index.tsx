import React, { useCallback, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNavigate } from "react-router-dom";
import { resources } from "@vhrs/resources";
import { useRItem } from "@vhrs/user-interfaces";

/** Maps overview: every row opens the graphical DecisionMapEditor. */
const DecisionMapsList: React.FC = () => {
  const navigate = useNavigate();
  const mapsReq = useRItem(resources.DecisionMap, { url: "/decision-map/", pageSize: 100 });
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const openEditor = useCallback((mapId: number) => navigate(`/maps/${mapId}`), [navigate]);

  const handleDelete = useCallback(
    async (mapId: number) => {
      if (!window.confirm("Delete this decision map and its nodes/edges?")) return;
      await mapsReq.deleteItem(String(mapId));
      await mapsReq.fetchItems(true);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mapsReq.deleteItem, mapsReq.fetchItems]
  );

  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res: any = await mapsReq.createItem({
        name: name.trim(),
        description: "",
        version: "1.0.0",
        is_active: true,
        category: "manual",
        layout: { nodes: [], edges: [] },
        status: "activated",
      });
      const created = res?.data ?? {};
      setCreating(false);
      setName("");
      await mapsReq.fetchItems(true);
      if (created?.id) navigate(`/maps/${created.id}`);
    } catch (e: any) {
      setError(e?.response?.data?.detail || JSON.stringify(e?.response?.data || e?.message || "Create failed"));
    } finally {
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, navigate]);

  const rows = Array.isArray(mapsReq.data) ? mapsReq.data : [];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <Typography variant="h5">Decision Maps</Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>
          New map
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Each map is a graphical decision flow with its YAML spec stored in the database. Open one to drag, drop and
        connect nodes.
      </Typography>
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Version</TableCell>
              <TableCell>Active</TableCell>
              <TableCell>YAML bytes</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((m: any) => (
              <TableRow key={m.id} hover>
                <TableCell>
                  <Button
                    startIcon={<AccountTreeIcon />}
                    onClick={() => openEditor(m.id)}
                    sx={{ textTransform: "none", fontWeight: 600 }}
                  >
                    {m.name}
                  </Button>
                </TableCell>
                <TableCell>{m.category || "—"}</TableCell>
                <TableCell>{m.version || "—"}</TableCell>
                <TableCell>
                  <Chip size="small" label={m.is_active ? "active" : "inactive"} color={m.is_active ? "success" : "default"} />
                </TableCell>
                <TableCell>{m.spec_yaml ? m.spec_yaml.length : 0}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Open graphical editor">
                    <Button size="small" variant="outlined" onClick={() => openEditor(m.id)} sx={{ mr: 1 }}>
                      Open editor
                    </Button>
                  </Tooltip>
                  <Tooltip title="Delete map">
                    <IconButton size="small" color="error" onClick={() => handleDelete(m.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {rows.length === 0 && !mapsReq.isLoading && (
          <Typography sx={{ p: 2 }} color="text.secondary">
            No decision maps yet — create one to start drawing.
          </Typography>
        )}
      </Paper>

      <Dialog open={creating} onClose={() => setCreating(false)}>
        <DialogTitle>New decision map</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Name"
            fullWidth
            margin="dense"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {error && (
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              {error}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreating(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={busy}>
            {busy ? "Creating…" : "Create & open editor"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DecisionMapsList;
