import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Switch,
  FormControlLabel,
  TextField,
  Typography,
} from "@mui/material";
import { resources } from "@vhrs/resources";
import { useRItem } from "@vhrs/user-interfaces";

interface RowState {
  client_id: string;
  client_secret: string;
  is_active: boolean;
  dirty: boolean;
  savedFlash: boolean;
}

/** OAuth client keys live in Django (OAuthProvider rows). Macaco fetches them
 *  at boot to configure Passport; the DRF session token stays in Django.
 *  Changing keys here requires a macaco restart to take effect. */
const OAuthSettings: React.FC = () => {
  const { data, isLoading, saveItem, fetchItems } = useRItem(resources.OAuthProvider, { pageSize: 20 });
  const [rows, setRows] = useState<Record<number, RowState>>({});
  const [error, setError] = useState("");

  const providers = Array.isArray(data) ? data : [];

  useEffect(() => {
    setRows((prev) => {
      const next: Record<number, RowState> = { ...prev };
      for (const p of providers) {
        if (!next[p.id]) {
          next[p.id] = {
            client_id: p.client_id || "",
            client_secret: "",
            is_active: !!p.is_active,
            dirty: false,
            savedFlash: false,
          };
        }
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const set = (id: number, patch: Partial<RowState>) =>
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch, dirty: true, savedFlash: false } }));

  const save = async (id: number) => {
    const r = rows[id];
    if (!r) return;
    setError("");
    try {
      const payload: any = { client_id: r.client_id, is_active: r.is_active };
      if (r.client_secret) payload.client_secret = r.client_secret; // write-only; blank keeps existing
      await saveItem(String(id), payload);
      setRows((prev) => ({ ...prev, [id]: { ...prev[id], client_secret: "", dirty: false, savedFlash: true } }));
      await fetchItems(true);
    } catch (e: any) {
      setError(e?.response?.data?.detail || JSON.stringify(e?.response?.data || "Save failed"));
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 860 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Login providers
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
        OAuth client keys are stored in Django and loaded by the proxy at boot. After changing keys, restart the
        macaco container. Secrets are write-only and never displayed back.
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {isLoading && providers.length === 0 && <Typography color="text.secondary">Loading…</Typography>}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {providers.map((p: any) => {
          const r = rows[p.id];
          return (
            <Card key={p.id} variant="outlined">
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, textTransform: "capitalize" }}>
                    {p.provider}
                  </Typography>
                  <Chip
                    size="small"
                    label={p.configured ? "configured" : "not configured"}
                    color={p.configured ? "success" : "default"}
                  />
                  <Box sx={{ flexGrow: 1 }} />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!!r?.is_active}
                        onChange={(e) => set(p.id, { is_active: e.target.checked })}
                      />
                    }
                    label="Active"
                  />
                </Box>
                <TextField
                  fullWidth
                  size="small"
                  margin="normal"
                  label="Client ID"
                  value={r?.client_id ?? ""}
                  onChange={(e) => set(p.id, { client_id: e.target.value })}
                />
                <TextField
                  fullWidth
                  size="small"
                  margin="normal"
                  label="Client secret (blank keeps existing)"
                  type="password"
                  value={r?.client_secret ?? ""}
                  onChange={(e) => set(p.id, { client_secret: e.target.value })}
                />
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                  <Button variant="contained" disabled={!r?.dirty} onClick={() => save(p.id)}>
                    Save
                  </Button>
                  {r?.savedFlash && (
                    <Typography variant="body2" color="success.main">
                      Saved — restart macaco to apply.
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
};

export default OAuthSettings;
