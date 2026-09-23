import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Drawer,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import WarningIcon from "@mui/icons-material/Warning";
import TimelapseIcon from "@mui/icons-material/Timelapse";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import RefreshIcon from "@mui/icons-material/Refresh";
import FilterListIcon from "@mui/icons-material/FilterList";
import ReplayIcon from "@mui/icons-material/Replay";
import CloseIcon from "@mui/icons-material/Close";
import { useRItem } from "@vhrs/user-interfaces";
import { resources } from "@vhrs/resources";

const STATUS_META: Record<string, { icon: React.ReactNode; color: "success" | "error" | "warning" | "info" | "default" }> = {
  decided: { icon: <CheckCircleIcon fontSize="small" />, color: "success" },
  escalated: { icon: <WarningIcon fontSize="small" />, color: "warning" },
  failed: { icon: <ErrorIcon fontSize="small" />, color: "error" },
  running: { icon: <TimelapseIcon fontSize="small" />, color: "info" },
  pending: { icon: <HourglassEmptyIcon fontSize="small" />, color: "default" },
};

const ROUTE_COLORS: Record<string, "success" | "error" | "warning" | "info" | "default"> = {
  proceed_fast: "success",
  deep_review: "warning",
  split_task: "info",
  block: "error",
};

const summarize = (obj: any, max = 90) => {
  const s = typeof obj === "string" ? obj : JSON.stringify(obj ?? {});
  return s.length > max ? `${s.slice(0, max)}…` : s;
};

const durationOf = (run: any) => {
  if (!run.started_at || !run.finished_at) return "—";
  const ms = new Date(run.finished_at).getTime() - new Date(run.started_at).getTime();
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
};

/** GitHub Actions-style workflow runs: status list, per-run steps/logs, re-run. */
const WorkflowRuns: React.FC = () => {
  const [mapFilter, setMapFilter] = useState<string>("all");
  const [filtersVisible, setFiltersVisible] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [rerunning, setRerunning] = useState<number | null>(null);

  const runsReq = useRItem(resources.DecisionRun, {
    url: "/decision-run/",
    filter: mapFilter === "all" ? undefined : { map: Number(mapFilter) },
    sortBy: ["-id"],
    pageSize: 100,
    fetchOnDeclare: false,
  });
  const mapsReq = useRItem(resources.DecisionMap, { url: "/decision-map/", pageSize: 100 });
  const rerunReq = useRItem(resources.EngineCall, { url: "/engine-call/", fetchOnDeclare: false });

  // Backend-side filtering: refetch whenever the map filter changes.
  useEffect(() => {
    runsReq.fetchItems(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapFilter]);

  const runs: any[] = Array.isArray(runsReq.data) ? runsReq.data : [];
  const maps: any[] = Array.isArray(mapsReq.data) ? mapsReq.data : [];
  const mapName = useMemo(() => {
    const m = new Map(maps.map((x: any) => [x.id, x.name]));
    return (id: number) => m.get(id) || `Map ${id}`;
  }, [maps]);

  const filtered = runs;

  const openDetail = useCallback((run: any) => {
    setSelectedId(run.id);
    setDetail(run);
  }, []);

  useEffect(() => {
    if (selectedId == null) return;
    const fresh = runs.find((r: any) => r.id === selectedId);
    if (fresh) setDetail(fresh);
  }, [runs, selectedId]);

  const handleRerun = useCallback(
    async (run: any) => {
      setRerunning(run.id);
      try {
        await rerunReq.createItem({ map: run.map, state: run.trigger_event || {}, status: "activated" });
        await runsReq.fetchItems(true);
      } finally {
        setRerunning(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runsReq.fetchItems]
  );

  const steps = useMemo(() => {
    const answers = detail?.answers || {};
    return Object.entries(answers).filter(([k]) => !k.startsWith("_"));
  }, [detail]);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <Typography variant="h5">Workflow runs</Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title={filtersVisible ? "Hide filters" : "Show filters"}>
          <IconButton onClick={() => setFiltersVisible((v) => !v)} color={filtersVisible ? "primary" : "default"}>
            <FilterListIcon />
          </IconButton>
        </Tooltip>
        {filtersVisible && (
          <FormControl size="small" sx={{ minWidth: 200, mr: 1 }}>
            <InputLabel>Map</InputLabel>
            <Select value={mapFilter} label="Map" onChange={(e) => setMapFilter(e.target.value)}>
              <MenuItem value="all">All maps</MenuItem>
              {maps.map((m: any) => (
                <MenuItem key={m.id} value={String(m.id)}>
                  {m.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <Tooltip title="Refresh">
          <IconButton onClick={() => runsReq.fetchItems(true)}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Status</TableCell>
              <TableCell>Run</TableCell>
              <TableCell>Trigger</TableCell>
              <TableCell>Route</TableCell>
              <TableCell>Confidence</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Finished</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((r: any) => {
              const meta = STATUS_META[r.status] || STATUS_META.pending;
              return (
                <TableRow key={r.id} hover selected={r.id === selectedId}>
                  <TableCell>
                    <Chip size="small" icon={meta.icon as any} label={r.status} color={meta.color} />
                  </TableCell>
                  <TableCell>
                    <Button onClick={() => openDetail(r)} sx={{ textTransform: "none", fontWeight: 600 }}>
                      #{r.id} · {mapName(r.map)}
                    </Button>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 280 }}>
                    <Typography variant="body2" noWrap title={JSON.stringify(r.trigger_event)}>
                      {summarize(r.trigger_event)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {r.decided_route ? (
                      <Chip size="small" label={r.decided_route} color={ROUTE_COLORS[r.decided_route] || "default"} />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{r.confidence != null ? `${Math.round(r.confidence * 100)}%` : "—"}</TableCell>
                  <TableCell>{durationOf(r)}</TableCell>
                  <TableCell>{r.finished_at ? new Date(r.finished_at).toLocaleString() : "—"}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Re-run with same trigger state">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => handleRerun(r)}
                          disabled={rerunning === r.id}
                        >
                          <ReplayIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {filtered.length === 0 && !runsReq.isLoading && (
          <Typography sx={{ p: 2 }} color="text.secondary">
            No runs yet — run a map from its editor Test panel.
          </Typography>
        )}
      </Paper>

      <Drawer anchor="right" open={detail != null} onClose={() => { setDetail(null); setSelectedId(null); }}>
        {detail && (
          <Box sx={{ width: 560, p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Typography variant="h6">
                Run #{detail.id} · {mapName(detail.map)}
              </Typography>
              <Box sx={{ flexGrow: 1 }} />
              <IconButton onClick={() => { setDetail(null); setSelectedId(null); }}>
                <CloseIcon />
              </IconButton>
            </Box>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Chip
                size="small"
                icon={(STATUS_META[detail.status] || STATUS_META.pending).icon as any}
                label={detail.status}
                color={(STATUS_META[detail.status] || STATUS_META.pending).color}
              />
              {detail.decided_route && (
                <Chip size="small" label={`route: ${detail.decided_route}`} color={ROUTE_COLORS[detail.decided_route] || "default"} />
              )}
              {detail.confidence != null && <Chip size="small" label={`confidence ${Math.round(detail.confidence * 100)}%`} />}
              <Chip size="small" label={`duration ${durationOf(detail)}`} variant="outlined" />
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Steps
            </Typography>
            <Paper variant="outlined" sx={{ p: 1 }}>
              {steps.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No per-node answers recorded.
                </Typography>
              )}
              {steps.map(([k, v]) => (
                <Box key={k} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5, borderBottom: "1px solid #eee" }}>
                  <CheckCircleIcon fontSize="small" color="success" />
                  <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 140 }}>
                    {k}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap title={JSON.stringify(v)}>
                    {summarize(v, 140)}
                  </Typography>
                </Box>
              ))}
              {detail.executed_action && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}>
                  <CheckCircleIcon fontSize="small" color="success" />
                  <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 140 }}>
                    action
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {detail.executed_action}
                  </Typography>
                </Box>
              )}
              {detail.error && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}>
                  <ErrorIcon fontSize="small" color="error" />
                  <Typography variant="body2" color="error">
                    {detail.error}
                  </Typography>
                </Box>
              )}
            </Paper>
            {(detail.action_results || []).length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Outgoing actions
                </Typography>
                <Paper variant="outlined" sx={{ p: 1 }}>
                  {(detail.action_results || []).map((a: any, i: number) => (
                    <Box key={`${a.node}-${i}`} sx={{ py: 0.5, borderBottom: "1px solid #eee" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        {a.skipped ? (
                          <HourglassEmptyIcon fontSize="small" color="disabled" />
                        ) : a.dry_run ? (
                          <TimelapseIcon fontSize="small" color="info" />
                        ) : a.ok ? (
                          <CheckCircleIcon fontSize="small" color="success" />
                        ) : (
                          <ErrorIcon fontSize="small" color="error" />
                        )}
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {a.node}
                        </Typography>
                        {a.method && (
                          <Chip size="small" label={a.method} variant="outlined" sx={{ height: 20 }} />
                        )}
                        {a.status != null && (
                          <Chip
                            size="small"
                            label={a.status}
                            color={a.ok ? "success" : "error"}
                            sx={{ height: 20 }}
                          />
                        )}
                        {a.dry_run && <Chip size="small" label="dry-run" color="info" sx={{ height: 20 }} />}
                        {a.skipped && <Chip size="small" label="skipped" sx={{ height: 20 }} />}
                      </Box>
                      {a.url && (
                        <Typography variant="caption" color="text.secondary" noWrap title={a.url} sx={{ display: "block" }}>
                          {a.url}
                        </Typography>
                      )}
                      {(a.error || a.note || a.reason) && (
                        <Typography variant="caption" color={a.error ? "error" : "text.secondary"} sx={{ display: "block" }}>
                          {a.error || a.note || a.reason}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Paper>
              </>
            )}
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Trigger event
            </Typography>
            <Paper variant="outlined" sx={{ p: 1, background: "#f7f7f7", maxHeight: 200, overflow: "auto" }}>
              <Typography variant="caption" component="pre" sx={{ m: 0, whiteSpace: "pre-wrap" }}>
                {JSON.stringify(detail.trigger_event, null, 2)}
              </Typography>
            </Paper>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Answers (log)
            </Typography>
            <Paper variant="outlined" sx={{ p: 1, background: "#f7f7f7", maxHeight: 260, overflow: "auto" }}>
              <Typography variant="caption" component="pre" sx={{ m: 0, whiteSpace: "pre-wrap" }}>
                {JSON.stringify(detail.answers, null, 2)}
              </Typography>
            </Paper>
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button variant="contained" startIcon={<ReplayIcon />} onClick={() => handleRerun(detail)} disabled={rerunning === detail.id}>
                {rerunning === detail.id ? "Re-running…" : "Re-run"}
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>
    </Box>
  );
};

export default WorkflowRuns;
