import React, { useMemo } from "react";
import { Box, Button, Card, CardActionArea, CardContent, Chip, Grid, Paper, Typography } from "@mui/material";
import { AccountTree, PlayArrow, Webhook, FactCheck } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { resources } from "@vhrs/resources";
import { useRItem } from "@vhrs/user-interfaces";

const KpiCard: React.FC<{ icon: React.ReactNode; value: React.ReactNode; label: string; to: string }> = ({
  icon,
  value,
  label,
  to,
}) => {
  const navigate = useNavigate();
  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }} data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardActionArea onClick={() => navigate(to)} sx={{ p: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ color: "primary.main", display: "flex" }}>{icon}</Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
          </Box>
        </Box>
      </CardActionArea>
    </Card>
  );
};

const timeAgo = (iso?: string) => {
  if (!iso) return "—";
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const mapsReq = useRItem(resources.DecisionMap, { pageSize: 100 });
  const runsReq = useRItem(resources.DecisionRun, { pageSize: 100, sortBy: ["-id"] });
  const approvalsReq = useRItem(resources.ApprovalRequest, {
    filter: { status: "pending" },
    pageSize: 20,
    sortBy: ["-id"],
  });
  const hooksReq = useRItem(resources.WebhookEndpoint, { pageSize: 100 });

  const maps: any[] = Array.isArray(mapsReq.data) ? mapsReq.data : [];
  const runs: any[] = Array.isArray(runsReq.data) ? runsReq.data : [];
  const pending: any[] = Array.isArray(approvalsReq.data) ? approvalsReq.data : [];
  const hooks: any[] = Array.isArray(hooksReq.data) ? hooksReq.data : [];

  const mapById = useMemo(() => {
    const m = new Map<number, any>();
    for (const map of maps) m.set(map.id, map);
    return m;
  }, [maps]);

  const runsToday = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return runs.filter((r: any) => r.created_date_time && new Date(r.created_date_time) >= start).length;
  }, [runs]);

  const inbound = hooks.filter((h: any) => h.direction === "inbound").length;
  const outbound = hooks.filter((h: any) => h.direction === "outbound").length;

  return (
    <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2.5, maxWidth: 1200 }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        JevFlow Dashboard
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<AccountTree />} value={mapsReq.total || maps.length} label="Decision maps" to="/maps" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            icon={<PlayArrow />}
            value={`${runsToday} today · ${runsReq.total || runs.length} total`}
            label="Runs"
            to="/runs"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<FactCheck />} value={pending.length} label="Pending approvals" to="/runs" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<Webhook />} label="Hooks" value={`${inbound} in · ${outbound} out`} to="/webhooks" />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Pending approvals
              </Typography>
              <Chip size="small" label={pending.length} variant="outlined" />
            </Box>
            {pending.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Nothing waiting — approval requests from runs will show up here.
              </Typography>
            )}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {pending.slice(0, 5).map((r: any) => (
                <Box
                  key={r.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    p: 1.25,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                      {r.summary || `${mapById.get(r.map)?.name || `Map ${r.map}`} · ${r.node_key}`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {timeAgo(r.created_date_time)}
                    </Typography>
                  </Box>
                  <Button size="small" variant="outlined" onClick={() => navigate(`/approvals/${r.token}/`)} disabled={!r.token}>
                    Review
                  </Button>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Recent runs
              </Typography>
              <Button size="small" onClick={() => navigate("/runs")}>
                View all
              </Button>
            </Box>
            {runs.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No runs yet — trigger a map to see activity here.
              </Typography>
            )}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {runs.slice(0, 5).map((r: any) => (
                <Box
                  key={r.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    p: 1.25,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                      {mapById.get(r.map)?.name || `Map ${r.map}`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {r.decided_route} · {Math.round((r.confidence ?? 0) * 100)}% · {timeAgo(r.created_date_time)}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={r.status}
                    color={r.status === "decided" ? "success" : r.status === "escalated" ? "warning" : "default"}
                  />
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
