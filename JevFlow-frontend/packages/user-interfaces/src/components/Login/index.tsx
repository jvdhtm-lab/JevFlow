import React, { useEffect, useState } from "react";
import { Box, Button, Card, CardContent, TextField, Typography } from "@mui/material";
import { Google, Mail, Chat, GitHub, Twitter } from "@mui/icons-material";
import { resources } from "@vhrs/resources";
import { useRItem } from "../hooks/useRItem";

const PROVIDER_BUTTONS: Record<string, { label: string; icon: React.ReactNode }> = {
  google: { label: "Google", icon: <Google /> },
  github: { label: "GitHub", icon: <GitHub /> },
  x: { label: "X", icon: <Twitter /> },
  outlook: { label: "Outlook", icon: <Mail /> },
  slack: { label: "Slack", icon: <Chat /> },
};

const Login: React.FC<{ auth: any }> = ({ auth }) => {
  const [email, setEmail] = useState("root@local.com");
  const [password, setPassword] = useState("admin");
  const [err, setErr] = useState("");
  // Only offer providers the proxy actually configured (keys in Django).
  const [providers, setProviders] = useState<string[]>([]);
  const providersReq = useRItem(resources.OAuthProvider, { url: "/auth/providers/", fetchOnDeclare: false });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await providersReq.fetchItems(true);
        if (cancelled) return;
        const rows = res?.data;
        setProviders(
          (Array.isArray(rows) ? rows : []).filter((r: any) => r?.configured).map((r: any) => r.provider)
        );
      } catch {
        /* fall back to local-only */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await auth.login(email, password);
    } catch {
      setErr("Login failed");
    }
  };
  const oauth = (p: string) => {
    window.location.href = `/auth/${p}`;
  };
  return (
    <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
      <Card sx={{ width: 380 }}>
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="h5">JevFlow</Typography>
          <Box component="form" onSubmit={submit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            {err && <Typography color="error">{err}</Typography>}
            <Button type="submit" variant="contained">
              Login
            </Button>
          </Box>
          {providers.map((p) => {
            const btn = PROVIDER_BUTTONS[p];
            if (!btn) return null;
            return (
              <Button key={p} startIcon={btn.icon} variant="outlined" onClick={() => oauth(p)}>
                {btn.label}
              </Button>
            );
          })}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
