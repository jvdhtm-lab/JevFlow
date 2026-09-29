import React, { useState } from "react";
import { Alert, Box, Button, Chip, Paper, Typography } from "@mui/material";
import { CheckCircle, Cancel } from "@mui/icons-material";
import { useParams } from "react-router-dom";
import { resources } from "@vhrs/resources";
import { useRItem } from "@vhrs/user-interfaces";

/** Human review for an approval request: auto-generated URL, login required
 *  (PrivateRoute), shows the run result, then approve or decline. */
const ApprovalReview: React.FC = () => {
  const { token } = useParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const reqApi = useRItem(resources.ApprovalRequest, {
    filter: token ? { token } : undefined,
    fetchOnDeclare: !!token,
  });
  const rows: any[] = Array.isArray(reqApi.data) ? reqApi.data : [];
  const req = rows[0];
  const decideApi = useRItem(resources.ApprovalRequest, {
    url: req?.id ? `/approval-request/${req.id}/approve/` : "/approval-request/0/approve/",
    fetchOnDeclare: false,
  });
  const declineApi = useRItem(resources.ApprovalRequest, {
    url: req?.id ? `/approval-request/${req.id}/decline/` : "/approval-request/0/decline/",
    fetchOnDeclare: false,
  });

  const decide = async (approve: boolean) => {
    if (!req?.id) return;
    setBusy(true);
    setError("");
    try {
      // Distinct hooks per action so each POST hits its own endpoint.
      await (approve ? decideApi : declineApi).createItem({});
      await reqApi.fetchItems(true);
    } catch (e: any) {
      setError(e?.response?.data?.detail || JSON.stringify(e?.response?.data || "Decision failed"));
    } finally {
      setBusy(false);
    }
  };

  const payload = req?.payload || {};
  const answers = payload.answers || {};

  return (
    <Box sx={{ p: 3, maxWidth: 720 }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        Approval review
      </Typography>
      {reqApi.isLoading && !req && <Typography color="text.secondary">Loading…</Typography>}
      {!reqApi.isLoading && !req && (
        <Alert severity="warning">No approval request found for this link. It may have been handled already.</Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {req && (
        <Paper variant="outlined" sx={{ borderRadius: 2, p: 2.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, flexGrow: 1 }}>
              {req.summary || `Node \`${req.node_key}\``}
            </Typography>
            <Chip
              size="small"
              label={req.status}
              color={req.status === "approved" ? "success" : req.status === "declined" ? "error" : "warning"}
            />
          </Box>
          {req.description && (
            <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: 2 }}>
              <Typography
                variant="body2"
                component="pre"
                sx={{ m: 0, whiteSpace: "pre-wrap", fontFamily: "inherit" }}
              >
                {req.description}
              </Typography>
            </Paper>
          )}
          <Typography variant="body2" color="text.secondary">
            Route: <strong>{payload.route || "—"}</strong>
          </Typography>
          <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: 2 }}>
            <Typography
              variant="caption"
              component="pre"
              sx={{ m: 0, whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: 11 }}
            >
              {JSON.stringify(answers, null, 2)}
            </Typography>
          </Paper>
          {req.status === "pending" ? (
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircle />}
                disabled={busy}
                onClick={() => decide(true)}
              >
                Approve
              </Button>
              <Button variant="outlined" color="error" startIcon={<Cancel />} disabled={busy} onClick={() => decide(false)}>
                Decline
              </Button>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Decided{req.decided_at ? ` at ${new Date(req.decided_at).toLocaleString()}` : ""}.
            </Typography>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default ApprovalReview;
