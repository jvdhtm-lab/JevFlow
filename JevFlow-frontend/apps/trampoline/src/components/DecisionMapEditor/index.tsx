import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  ReactFlowInstance,
  NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  TextField,
  Tabs,
  Tab,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
import BoltIcon from "@mui/icons-material/Bolt";
import GavelIcon from "@mui/icons-material/Gavel";
import CategoryIcon from "@mui/icons-material/Category";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import AltRouteIcon from "@mui/icons-material/AltRoute";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import VerifiedIcon from "@mui/icons-material/Verified";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import CodeIcon from "@mui/icons-material/Code";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { resources } from "@vhrs/resources";
import { useRItem } from "@vhrs/user-interfaces";
import { WebhookEndpointForm } from "@vhrs/user-interfaces";
import { ApprovalToolForm } from "@vhrs/user-interfaces";
import { NODE_TYPE_COLORS, colors } from "../../colors";

// DB node types (must match DECISION_NODE_TYPE_CHOICES).
const PALETTE: string[] = [
  "trigger",
  "rule",
  "classification",
  "prioritization",
  "decision",
  "action",
  "branch",
  "approval",
  "llm_agent",
];

const typeColor = (t: string) => NODE_TYPE_COLORS[t] || colors.fallback;

const TYPE_ICONS: Record<string, React.ReactNode> = {
  trigger: <BoltIcon sx={{ fontSize: 16 }} />,
  rule: <GavelIcon sx={{ fontSize: 16 }} />,
  classification: <CategoryIcon sx={{ fontSize: 16 }} />,
  prioritization: <LeaderboardIcon sx={{ fontSize: 16 }} />,
  decision: <AltRouteIcon sx={{ fontSize: 16 }} />,
  action: <PlayArrowIcon sx={{ fontSize: 16 }} />,
  branch: <CallSplitIcon sx={{ fontSize: 16 }} />,
  approval: <VerifiedIcon sx={{ fontSize: 16 }} />,
  llm_agent: <AutoAwesomeIcon sx={{ fontSize: 16 }} />,
};

const TYPE_HINTS: Record<string, string> = {
  trigger: "Entry point — webhook, manual, schedule, event",
  rule: "Yes/no guard before continuing",
  classification: "Choice question — route by category",
  prioritization: "Score rubric — rank by severity",
  decision: "Choice question — pick the next step",
  action: "Do something — post, ticket, merge, page",
  branch: "Split the flow on conditions",
  approval: "Human sign-off gate",
  llm_agent: "Ask an LLM — prompt via hook or integration, branch on the answer",
};

// ---- minimal YAML emitter (no extra deps): mirrors the DB spec format ----
const yamlScalar = (v: any): string => {
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "null";
  return JSON.stringify(String(v));
};

const emitYamlLines = (v: any, indent: number, out: string[]) => {
  const pad = "  ".repeat(indent);
  if (Array.isArray(v)) {
    if (v.length === 0) {
      out.push(`${pad}[]`);
      return;
    }
    for (const item of v) {
      out.push(`${pad}-`);
      emitYamlLines(item, indent + 1, out);
    }
    return;
  }
  if (v !== null && typeof v === "object") {
    const keys = Object.keys(v);
    if (!keys.length) {
      out.push(`${pad}{}`);
      return;
    }
    for (const k of keys) {
      const val = v[k];
      if (val !== null && typeof val === "object") {
        out.push(`${pad}${k}:`);
        emitYamlLines(val, indent + 1, out);
      } else {
        out.push(`${pad}${k}: ${yamlScalar(val)}`);
      }
    }
    return;
  }
  out.push(`${pad}${yamlScalar(v)}`);
};

type ShapeKind = "stadium" | "rect" | "parallelogram" | "trapezoid" | "diamond" | "hexagon" | "ellipse" | "dashed";

const TYPE_SHAPES: Record<string, { kind: ShapeKind; w: number; h: number }> = {
  trigger: { kind: "stadium", w: 170, h: 64 },
  rule: { kind: "rect", w: 170, h: 76 },
  classification: { kind: "parallelogram", w: 180, h: 72 },
  prioritization: { kind: "trapezoid", w: 180, h: 76 },
  decision: { kind: "diamond", w: 170, h: 150 },
  action: { kind: "dashed", w: 170, h: 76 },
  branch: { kind: "hexagon", w: 170, h: 96 },
  approval: { kind: "ellipse", w: 170, h: 84 },
  llm_agent: { kind: "dashed", w: 180, h: 84 },
};

const shapeOf = (t: string) => TYPE_SHAPES[t] || { kind: "rect" as ShapeKind, w: 170, h: 76 };

const CLIPS: Record<string, string> = {
  trapezoid: "polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)",
  diamond: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
  hexagon: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
};

/** Bordered shape via layered backgrounds (border follows clip-path). */
const ShapedShell: React.FC<{ nodeType: string; color: string; children: React.ReactNode }> = ({
  nodeType,
  color,
  children,
}) => {
  const { kind, w, h } = shapeOf(nodeType);
  const border = kind === "dashed" ? `2px dashed ${color}` : `2px solid ${color}`;
  if (kind === "stadium")
    return (
      <Box sx={{ width: w, height: h, background: "#fff", border, borderRadius: 9999, display: "flex", alignItems: "center", justifyContent: "center", px: 2 }}>
        {children}
      </Box>
    );
  if (kind === "ellipse")
    return (
      <Box sx={{ width: w, height: h, background: "#fff", border, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", px: 3 }}>
        {children}
      </Box>
    );
  if (kind === "parallelogram")
    return (
      <Box sx={{ width: w, height: h, background: color, transform: "skewX(-12deg)", borderRadius: 1, p: "2px" }}>
        <Box sx={{ width: "100%", height: "100%", background: "#fff", borderRadius: 1, transform: "skewX(12deg)", display: "flex", alignItems: "center", justifyContent: "center", px: 1, overflow: "hidden" }}>
          {children}
        </Box>
      </Box>
    );
  if (kind === "trapezoid" || kind === "diamond" || kind === "hexagon") {
    const clip = CLIPS[kind];
    return (
      <Box sx={{ width: w, height: h, background: color, clipPath: clip, p: "2px" }}>
        <Box sx={{ width: "100%", height: "100%", background: "#fff", clipPath: clip, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", textAlign: "center", px: kind === "diamond" ? 4 : 2 }}>
          {children}
        </Box>
      </Box>
    );
  }
  // rect + dashed
  return (
    <Box sx={{ width: w, height: h, background: "#fff", border, borderRadius: 2, display: "flex", alignItems: "center", px: 1.5, borderLeft: nodeType === "rule" ? `6px solid ${color}` : undefined }}>
      {children}
    </Box>
  );
};

/** Custom canvas node: distinct geometric shape + icon per node type. */
const MapNode: React.FC<NodeProps<MapNodeData>> = ({ data, selected }) => {
  const color = typeColor(data.nodeType);
  const { w, h } = shapeOf(data.nodeType);
  const qtype = data.config?.qtype;
  const compact = data.nodeType === "diamond" || data.nodeType === "hexagon";
  return (
    <Box sx={{ position: "relative", width: w, height: h, filter: selected ? `drop-shadow(0 0 5px ${color})` : undefined }}>
      <Handle type="target" position={Position.Top} style={{ zIndex: 10 }} />
      <ShapedShell nodeType={data.nodeType} color={color}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, maxWidth: "100%" }}>
          <Box sx={{ color, display: "flex", flexShrink: 0 }}>{TYPE_ICONS[data.nodeType] || <HelpOutlineIcon sx={{ fontSize: 16 }} />}</Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, lineHeight: 1.2, fontSize: compact ? 12 : 13 }}>
              {data.title || data.key}
            </Typography>
            {!compact && (
              <Box sx={{ display: "flex", gap: 0.5, mt: 0.25 }}>
                <Typography variant="caption" sx={{ color, fontSize: 10, lineHeight: 1 }}>
                  {data.nodeType}
                </Typography>
                {qtype && (
                  <Typography variant="caption" sx={{ fontSize: 10, lineHeight: 1, color: "text.secondary" }}>
                    · {qtype}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </ShapedShell>
      <Handle type="source" position={Position.Bottom} style={{ zIndex: 10 }} />
    </Box>
  );
};

const DEFAULT_CONFIG: Record<string, any> = {
  trigger: { event: "manual" },
  rule: { qtype: "noul", instructions: "" },
  classification: { qtype: "choice", instructions: "", criteria: { options: [] } },
  prioritization: { qtype: "score", instructions: "", rubric: {} },
  decision: { qtype: "choice", instructions: "", criteria: { options: [] } },
  action: { action: "" },
  branch: {},
  approval: { approvers: [] },
  llm_agent: {
    prompt: "",
    system: "",
    model: "gpt-4o-mini",
    default_answer: "",
    response_path: "",
    dry_run: true,
  },
};

export interface MapNodeData {
  key: string;
  nodeType: string;
  title: string;
  config: any;
}

const nodeTypes = { jevNode: MapNode };

export interface MapEdgeData {
  label?: string;
  condition?: any;
  priority?: number;
}

const toFlowNodes = (rows: any[]): Node<MapNodeData>[] =>
  (rows || []).map((n: any) => ({
    id: `node-${n.node_key}`,
    type: "jevNode",
    position: { x: Number(n.position_x) || 0, y: Number(n.position_y) || 0 },
    data: {
      key: n.node_key,
      nodeType: n.node_type,
      title: n.title || n.node_key,
      config: n.config || {},
    },
  }));

const DecisionMapEditor: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const mapId = Number(id);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<MapNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<MapEdgeData>([]);
  const [mapName, setMapName] = useState(`Decision Map ${id || ""}`);
  const [mapVersion, setMapVersion] = useState("1.0.0");
  const [mapCategory, setMapCategory] = useState("manual");
  const [specYaml, setSpecYaml] = useState("");
  const [yamlOpen, setYamlOpen] = useState(false);
  const [sideTab, setSideTab] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [yamlDraft, setYamlDraft] = useState("");
  const [yamlError, setYamlError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [runState, setRunState] = useState("{}");
  const [runResult, setRunResult] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const counter = useRef(0);

  const [hookDialogOpen, setHookDialogOpen] = useState(false);
  const [hookDialogDirection, setHookDialogDirection] = useState<"inbound" | "outbound">("inbound");
  const [toolDialogOpen, setToolDialogOpen] = useState(false);
  const [mapIntegrationId, setMapIntegrationId] = useState<number | null>(null);

  const hooksReq = useRItem(resources.WebhookEndpoint, { pageSize: 100 });
  const hooks: any[] = Array.isArray(hooksReq.data) ? hooksReq.data : [];
  const toolsReq = useRItem(resources.ApprovalTool, { pageSize: 100 });
  const approvalTools: any[] = Array.isArray(toolsReq.data) ? toolsReq.data : [];
  const integrationsReq = useRItem(resources.Integration, { pageSize: 100 });
  const integrationList: any[] = Array.isArray(integrationsReq.data) ? integrationsReq.data : [];

  const mapReq = useRItem(resources.DecisionMap, { url: "/decision-map/", fetchOnDeclare: false });
  const nodeReq = useRItem(resources.DecisionNode, {
    url: "/decision-node/",
    filter: { map: mapId },
    fetchOnDeclare: false,
  });
  const edgeReq = useRItem(resources.DecisionEdge, {
    url: "/decision-edge/",
    filter: { map: mapId },
    fetchOnDeclare: false,
  });
  const saveGraphReq = useRItem(resources.DecisionMap, {
    url: `/decision-map/${mapId}/save-graph/`,
    fetchOnDeclare: false,
  });
  const importReq = useRItem(resources.DecisionMap, {
    url: `/decision-map/${mapId}/import-yaml/`,
    fetchOnDeclare: false,
  });
  const decideReq = useRItem(resources.EngineCall, { url: "/jev/decide/", fetchOnDeclare: false });

  const keyOf = useCallback((rfId: string) => rfId.replace(/^node-/, ""), []);

  // Live YAML equivalent of the current canvas — visible even for a brand-new
  // map that has never been saved. Save graph persists the same structure.
  const liveYaml = useMemo(() => {
    const doc = {
      version: mapVersion || "1.0.0",
      name: mapName,
      category: mapCategory,
      nodes: nodes.map((n) => ({
        key: n.data.key,
        type: n.data.nodeType,
        title: n.data.title,
        config: n.data.config || {},
        position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
      })),
      edges: edges.map((e, i) => ({
        from: keyOf(e.source),
        to: keyOf(e.target),
        label: e.data?.label || (typeof e.label === "string" ? e.label : "") || "",
        condition: e.data?.condition || {},
        priority: e.data?.priority ?? i,
      })),
    };
    const out: string[] = [];
    emitYamlLines(doc, 0, out);
    return out.join("\n");
  }, [nodes, edges, mapName, mapVersion, mapCategory, keyOf]);

  const reloadFromServer = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [mapRes, nodeRes, edgeRes] = await Promise.all([
        // VHRS hook contract: fetchItem(force, id) and fetchItems(force) both
        // resolve to the raw axios response ({ data: payload }).
        mapReq.fetchItem(true, String(mapId)),
        nodeReq.fetchItems(true),
        edgeReq.fetchItems(true),
      ]);
      const mapObj = (mapRes as any)?.data ?? mapRes;
      if (mapObj?.name) setMapName(mapObj.name);
      if (mapObj?.integration) setMapIntegrationId(Number(mapObj.integration));
      if (mapObj?.version) setMapVersion(mapObj.version);
      if (mapObj?.category) setMapCategory(mapObj.category);
      if (mapObj?.spec_yaml) {
        setSpecYaml(mapObj.spec_yaml);
        setYamlDraft(mapObj.spec_yaml);
      }
      const nodeRows: any[] = (nodeRes as any)?.data?.results ?? (nodeRes as any)?.data ?? [];
      const edgeRows: any[] = (edgeRes as any)?.data?.results ?? (edgeRes as any)?.data ?? [];
      // stash db ids for edge resolution, then strip before rendering
      const withIds: Node<MapNodeData>[] = toFlowNodes(nodeRows).map((n, i) => ({
        ...n,
        data: { ...n.data, dbId: nodeRows[i]?.id } as any,
      }));
      setNodes(withIds.map(({ data, ...rest }) => ({ ...rest, data: { key: data.key, nodeType: data.nodeType, title: data.title, config: data.config } })));
      // rebuild edges: rows carry source/target PKs, resolve via lookup
      const lookup = new Map<number, string>();
      withIds.forEach((n) => lookup.set((n.data as any).dbId, n.id));
      const flowEdges: Edge<MapEdgeData>[] = Array.isArray(edgeRows)
        ? (edgeRows
            .map((e: any) => {
              const s = lookup.get(e.source);
              const t = lookup.get(e.target);
              if (!s || !t) return null;
              return {
                id: `edge-${e.id}`,
                source: s,
                target: t,
                label: e.label || "",
                data: { label: e.label || "", condition: e.condition || {}, priority: e.priority || 0 },
              } as Edge<MapEdgeData>;
            })
            .filter(Boolean) as Edge<MapEdgeData>[])
        : [];
      setEdges(flowEdges);
      setDirty(false);
    } catch (e: any) {
      setLoadError(e?.message || "Failed to load map");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapId]);

  useEffect(() => {
    if (mapId) reloadFromServer();
  }, [mapId, reloadFromServer]);

  const markDirty = useCallback(() => setDirty(true), []);

  // ---- palette drag & drop ----
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const nextKey = useCallback(
    (t: string) => {
      const taken = new Set(nodes.map((n) => n.data.key));
      let k = `${t}-${counter.current + 1}`;
      while (taken.has(k)) {
        counter.current += 1;
        k = `${t}-${counter.current + 1}`;
      }
      counter.current += 1;
      return k;
    },
    [nodes]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const nodeType = e.dataTransfer.getData("application/jevflow-nodetype");
      if (!nodeType || !rfInstance || !wrapperRef.current) return;
      const bounds = wrapperRef.current.getBoundingClientRect();
      const position = rfInstance.project({ x: e.clientX - bounds.left, y: e.clientY - bounds.top });
      const key = nextKey(nodeType);
      setNodes((ns) => [
        ...ns,
        {
          id: `node-${key}`,
          type: "jevNode",
          position,
          data: { key, nodeType, title: key, config: DEFAULT_CONFIG[nodeType] || {} },
        },
      ]);
      markDirty();
    },
    [rfInstance, nextKey, setNodes, markDirty]
  );

  // ---- connect by dragging between handles ----
  const onConnect = useCallback(
    (conn: Connection) => {
      if (!conn.source || !conn.target) return;
      counter.current += 1;
      setEdges((es) =>
        addEdge(
          { ...conn, id: `edge-tmp-${counter.current}`, data: { label: "", condition: {}, priority: 0 } },
          es
        )
      );
      markDirty();
    },
    [setEdges, markDirty]
  );

  const onSelectionChange = useCallback((sel: { nodes: Node[]; edges: Edge[] }) => {
    setSelectedNodeId(sel.nodes.length ? sel.nodes[0].id : null);
    setSelectedEdgeId(sel.edges.length ? sel.edges[0].id : null);
  }, []);

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);
  const selectedEdge = useMemo(() => edges.find((e) => e.id === selectedEdgeId) || null, [edges, selectedEdgeId]);

  // ---- node config editor state (draft object, type-driven) ----
  const [nodeTitle, setNodeTitle] = useState("");
  const [nodeConfig, setNodeConfig] = useState<any>({});
  const [nodeConfigText, setNodeConfigText] = useState("{}");
  const [nodeConfigError, setNodeConfigError] = useState("");

  useEffect(() => {
    if (!selectedNode) return;
    const config = selectedNode.data.config || {};
    setNodeTitle(selectedNode.data.title || "");
    setNodeConfig(config);
    setNodeConfigText(JSON.stringify(config, null, 2));
    setNodeConfigError("");
    // Reset only when the selected node changes (not on every node mutation,
    // e.g. dragging), otherwise the draft would clobber in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId]);

  const cfg = nodeConfig;

  // Every structured editor funnels through updateConfig so the raw JSON
  // textarea stays a faithful mirror of the form.
  const updateConfig = useCallback((next: any) => {
    setNodeConfig(next ?? {});
    setNodeConfigText(JSON.stringify(next ?? {}, null, 2));
    setNodeConfigError("");
  }, []);

  const onConfigTextChange = useCallback((text: string) => {
    setNodeConfigText(text);
    try {
      setNodeConfig(text.trim() ? JSON.parse(text) : {});
      setNodeConfigError("");
    } catch {
      setNodeConfigError("Invalid JSON — fix before applying.");
    }
  }, []);

  const applyNodeConfig = useCallback(() => {
    if (!selectedNode || nodeConfigError) return;
    // Every action node must publish through a bound outbound hook.
    if (selectedNode.data.nodeType === "action" && !nodeConfig?.webhook_endpoint) {
      setNodeConfigError("Action nodes require a bound outbound hook — pick one above.");
      return;
    }
    // LLM agents need a real endpoint: outbound hook or integration (or dry_run preview).
    if (
      selectedNode.data.nodeType === "llm_agent" &&
      !nodeConfig?.webhook_endpoint &&
      !nodeConfig?.integration &&
      !nodeConfig?.dry_run
    ) {
      setNodeConfigError("LLM Agent needs a bound outbound hook or integration (or enable dry_run).");
      return;
    }
    setNodes((ns) =>
      ns.map((n) =>
        n.id === selectedNode.id
          ? { ...n, data: { ...n.data, title: nodeTitle || n.data.key, config: nodeConfig } }
          : n
      )
    );
    markDirty();
  }, [selectedNode, nodeTitle, nodeConfig, nodeConfigError, setNodes, markDirty]);

  // ---- type-driven config helpers ----
  const ntype = selectedNode?.data.nodeType ?? "";

  // choice (classification / decision): criteria.options + criteria.keywords
  const criteria: any = cfg?.criteria ?? {};
  const choiceOptions: string[] = Array.isArray(criteria.options) ? criteria.options : [];
  const choiceKeywords: Record<string, string[]> = criteria.keywords ?? {};
  const setChoice = (options: string[], keywords: Record<string, string[]>) =>
    updateConfig({ ...cfg, qtype: "choice", criteria: { ...criteria, options, keywords } });
  const updateOption = (i: number, name: string) => {
    const options = [...choiceOptions];
    const old = options[i];
    options[i] = name;
    const kw = { ...choiceKeywords };
    if (old !== name && old in kw) {
      kw[name] = kw[old];
      delete kw[old];
    }
    setChoice(options, kw);
  };
  const updateOptionKeywords = (name: string, txt: string) =>
    setChoice(choiceOptions, {
      ...choiceKeywords,
      [name]: txt.split(",").map((s) => s.trim()).filter(Boolean),
    });
  const addOption = () => {
    let i = choiceOptions.length + 1;
    let name = `option_${i}`;
    while (choiceOptions.includes(name)) {
      i += 1;
      name = `option_${i}`;
    }
    setChoice([...choiceOptions, name], { ...choiceKeywords, [name]: [] });
  };
  const removeOption = (i: number) => {
    const name = choiceOptions[i];
    const kw = { ...choiceKeywords };
    delete kw[name];
    setChoice(choiceOptions.filter((_, j) => j !== i), kw);
  };

  // noul (rule): instructions
  const noulText: string = cfg?.instructions ?? "";
  const setInstructions = (txt: string) => updateConfig({ ...cfg, qtype: "noul", instructions: txt });

  // score (prioritization): rubric.weights + rubric.keywords + rubric.levels
  const rubric: any = cfg?.rubric ?? {};
  const weights: Record<string, number> = rubric.weights ?? {};
  const rubricKw: Record<string, string[]> = rubric.keywords ?? {};
  const levels: any[] =
    Array.isArray(rubric.levels) && rubric.levels.length
      ? rubric.levels
      : [[80, "high"], [50, "medium"], [0, "low"]];
  const criterionNames = Object.keys(weights);
  const setRubric = (next: {
    weights: Record<string, number>;
    keywords: Record<string, string[]>;
    levels: any[];
  }) => updateConfig({ ...cfg, qtype: "score", rubric: { ...rubric, ...next } });
  const renameCriterion = (old: string, name: string) => {
    if (old === name) return;
    const w = { ...weights };
    const k = { ...rubricKw };
    if (old in w) {
      w[name] = w[old];
      delete w[old];
    }
    if (old in k) {
      k[name] = k[old];
      delete k[old];
    }
    setRubric({ weights: w, keywords: k, levels });
  };
  const setWeight = (name: string, val: number) =>
    setRubric({ weights: { ...weights, [name]: val }, keywords: rubricKw, levels });
  const setCriterionKeywords = (name: string, txt: string) =>
    setRubric({
      weights,
      keywords: { ...rubricKw, [name]: txt.split(",").map((s) => s.trim()).filter(Boolean) },
      levels,
    });
  const addCriterion = () => {
    let i = 1;
    let name = `criterion_${i}`;
    while (name in weights) {
      i += 1;
      name = `criterion_${i}`;
    }
    setRubric({ weights: { ...weights, [name]: 0.5 }, keywords: rubricKw, levels });
  };
  const removeCriterion = (name: string) => {
    const w = { ...weights };
    delete w[name];
    const k = { ...rubricKw };
    delete k[name];
    setRubric({ weights: w, keywords: k, levels });
  };
  const setLevel = (i: number, threshold: number, label: string) =>
    setRubric({
      weights,
      keywords: rubricKw,
      levels: levels.map((l, j) => (j === i ? [threshold, label] : l)),
    });
  const addLevel = () => setRubric({ weights, keywords: rubricKw, levels: [...levels, [0, "low"]] });
  const removeLevel = (i: number) =>
    setRubric({ weights, keywords: rubricKw, levels: levels.filter((_, j) => j !== i) });

  // trigger / approval / action / llm_agent
  const setEvent = (ev: string) => updateConfig({ ...cfg, event: ev });
  const setTool = (t: string) => updateConfig({ ...cfg, tool: t });
  const setActionName = (a: string) => updateConfig({ ...cfg, action: a });
  const setPrompt = (v: string) => updateConfig({ ...cfg, prompt: v });
  const setSystem = (v: string) => updateConfig({ ...cfg, system: v });
  const setModel = (v: string) => updateConfig({ ...cfg, model: v });
  const setDefaultAnswer = (v: string) => updateConfig({ ...cfg, default_answer: v });
  const setResponsePath = (v: string) => updateConfig({ ...cfg, response_path: v });
  const setTemperature = (v: string) => updateConfig({ ...cfg, temperature: Number(v) || 0 });
  const setDryRun = (v: boolean) => updateConfig({ ...cfg, dry_run: v });
  const setLlmIntegration = (value: string) => {
    if (!value) {
      const next = { ...cfg };
      delete next.integration;
      updateConfig(next);
      return;
    }
    updateConfig({ ...cfg, integration: Number(value) });
  };
  const setDenyTools = (txt: string) =>
    updateConfig({
      ...cfg,
      policy: { ...(cfg.policy || {}), deny_tools: txt.split(",").map((s) => s.trim()).filter(Boolean) },
    });
  const setStrict = (v: boolean) =>
    updateConfig({ ...cfg, policy: { ...(cfg.policy || {}), strict: v } });

  // ---- integration hook binding (action nodes + webhook triggers) ----
  const hookDirection: "inbound" | "outbound" = ntype === "trigger" ? "inbound" : "outbound";
  const nodeHooks = hooks.filter((h: any) => h.direction === hookDirection);
  const selectedHook = useMemo(
    () => hooks.find((h: any) => String(h.id) === String(cfg?.webhook_endpoint)) || null,
    [hooks, cfg?.webhook_endpoint]
  );
  const openHookDialog = () => {
    // Integration comes from the map itself — no repetitive re-picking.
    setHookDialogDirection(hookDirection);
    setHookDialogOpen(true);
  };
  const selectHook = (value: string) => {
    if (!value) {
      const next = { ...cfg };
      delete next.webhook_endpoint;
      updateConfig(next);
      return;
    }
    const hook = hooks.find((h: any) => String(h.id) === value);
    updateConfig({
      ...cfg,
      webhook_endpoint: Number(value),
      ...(ntype === "llm_agent"
        ? {}
        : { action: "http_post", method: cfg?.method || "POST" }),
      url: hook?.outbound_url || cfg?.url || "",
    });
  };
  // DynamicForm persists via the annotated resource's save action (VHRS
  // action pattern: onSave only closes + refetches, never transforms). Then
  // bind the hook just created by matching the submitted form.
  const handleHookSaved = useCallback(
    async (form?: any) => {
      setHookDialogOpen(false);
      try {
        const res: any = await hooksReq.fetchItems(true);
        const rows: any[] = res?.data?.results ?? res?.data ?? [];
        const match =
          rows.find(
            (h: any) =>
              String(h.integration) === String(form?.integration) &&
              h.direction === form?.direction &&
              h.source === form?.source &&
              (form?.direction === "inbound"
                ? (h.target_path || "") === (form?.target_path || "")
                : (h.target_url || "") === (form?.target_url || ""))
          ) ||
          [...rows]
            .filter(
              (h: any) =>
                String(h.integration) === String(form?.integration) && h.direction === form?.direction
            )
            .sort((a, b) => (b.id || 0) - (a.id || 0))[0];
        if (match?.id) selectHook(String(match.id));
      } catch (e: any) {
        setLoadError(e?.response?.data?.detail || e?.message || "Failed to reload hooks");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ---- approval tool binding (approval nodes notify a channel) ----
  const selectedApprovalTool = useMemo(
    () => approvalTools.find((t: any) => String(t.id) === String(cfg?.approval_tool)) || null,
    [approvalTools, cfg?.approval_tool]
  );
  const selectApprovalTool = (value: string) => {
    if (!value) {
      const next = { ...cfg };
      delete next.approval_tool;
      updateConfig(next);
      return;
    }
    updateConfig({ ...cfg, approval_tool: Number(value) });
  };
  const handleToolSaved = useCallback(
    async (form?: any) => {
      setToolDialogOpen(false);
      try {
        const res: any = await toolsReq.fetchItems(true);
        const rows: any[] = res?.data?.results ?? res?.data ?? [];
        const match =
          rows.find(
            (t: any) =>
              t.tool_type === form?.tool_type &&
              (t.target || "") === (form?.target || "")
          ) ||
          [...rows].sort((a, b) => (b.id || 0) - (a.id || 0))[0];
        if (match?.id) selectApprovalTool(String(match.id));
      } catch (e: any) {
        setLoadError(e?.response?.data?.detail || e?.message || "Failed to reload approval tools");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ---- edge editor state ----
  const [edgeLabel, setEdgeLabel] = useState("");
  const [edgeConditionText, setEdgeConditionText] = useState("");
  const [edgePriority, setEdgePriority] = useState(0);
  const [edgeError, setEdgeError] = useState("");

  useEffect(() => {
    if (selectedEdge) {
      setEdgeLabel(selectedEdge.data?.label || (typeof selectedEdge.label === "string" ? selectedEdge.label : "") || "");
      setEdgeConditionText(JSON.stringify(selectedEdge.data?.condition || {}, null, 2));
      setEdgePriority(selectedEdge.data?.priority || 0);
      setEdgeError("");
    }
  }, [selectedEdgeId, selectedEdge]);

  const applyEdgeConfig = useCallback(() => {
    if (!selectedEdge) return;
    let cond: any = {};
    try {
      cond = edgeConditionText.trim() ? JSON.parse(edgeConditionText) : {};
      setEdgeError("");
    } catch {
      setEdgeError("Condition is not valid JSON.");
      return;
    }
    setEdges((es) =>
      es.map((e) =>
        e.id === selectedEdge.id
          ? { ...e, label: edgeLabel, data: { label: edgeLabel, condition: cond, priority: Number(edgePriority) || 0 } }
          : e
      )
    );
    markDirty();
  }, [selectedEdge, edgeLabel, edgeConditionText, edgePriority, setEdges, markDirty]);

  const deleteSelected = useCallback(() => {
    if (selectedNode) {
      setEdges((es) => es.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
      setNodes((ns) => ns.filter((n) => n.id !== selectedNode.id));
      setSelectedNodeId(null);
      markDirty();
    } else if (selectedEdge) {
      setEdges((es) => es.filter((e) => e.id !== selectedEdge.id));
      setSelectedEdgeId(null);
      markDirty();
    }
  }, [selectedNode, selectedEdge, setNodes, setEdges, markDirty]);

  // ---- persist whole graph; backend syncs rows + regenerates YAML ----
  const saveGraph = useCallback(async () => {
    setSaving(true);
    setLoadError("");
    try {
      const unbound = nodes
        .filter((n) => n.data.nodeType === "action" && !n.data.config?.webhook_endpoint)
        .map((n) => n.data.key);
      if (unbound.length) {
        throw new Error(
          `Every action needs a bound outbound hook — bind one on: ${unbound.join(", ")}`
        );
      }
      const llmUnbound = nodes
        .filter(
          (n) =>
            n.data.nodeType === "llm_agent" &&
            !n.data.config?.webhook_endpoint &&
            !n.data.config?.integration &&
            !n.data.config?.dry_run
        )
        .map((n) => n.data.key);
      if (llmUnbound.length) {
        throw new Error(
          `LLM Agents need a bound hook or integration (or dry_run) — fix: ${llmUnbound.join(", ")}`
        );
      }
      const res: any = await saveGraphReq.createItem({
        nodes: nodes.map((n) => ({
          key: n.data.key,
          type: n.data.nodeType,
          title: n.data.title,
          config: n.data.config,
          x: Math.round(n.position.x),
          y: Math.round(n.position.y),
        })),
        edges: edges.map((e, i) => ({
          from: keyOf(e.source),
          to: keyOf(e.target),
          label: e.data?.label || (typeof e.label === "string" ? e.label : "") || "",
          condition: e.data?.condition || {},
          priority: e.data?.priority ?? i,
        })),
      });
      const yaml = res?.data?.spec_yaml ?? "";
      if (yaml) {
        setSpecYaml(yaml);
        setYamlDraft(yaml);
      }
      setDirty(false);
      await reloadFromServer();
    } catch (e: any) {
      setLoadError(e?.response?.data?.detail || e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, keyOf]);

  const importYaml = useCallback(async () => {
    setYamlError("");
    try {
      const res: any = await importReq.createItem({ spec_yaml: yamlDraft });
      const yaml = res?.data?.spec_yaml ?? "";
      if (yaml) setSpecYaml(yaml);
      setYamlOpen(false);
      await reloadFromServer();
    } catch (e: any) {
      setYamlError(e?.response?.data?.detail || e?.message || "Import failed");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yamlDraft]);

  const runTest = useCallback(async () => {
    setRunResult(null);
    let state: any = {};
    try {
      state = runState.trim() ? JSON.parse(runState) : {};
    } catch {
      setRunResult({ error: "State is not valid JSON." });
      return;
    }
    try {
      const res: any = await decideReq.createItem({ map: mapId, state });
      setRunResult(res?.data ?? res);
    } catch (e: any) {
      setRunResult({ error: e?.response?.data?.detail || e?.message || "Run failed" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runState, mapId]);

  return (
    <Box
      sx={{
        position: "relative",
        height: "calc(100vh - 64px)",
        display: "flex",
        gap: 1.5,
        p: 1.5,
        bgcolor: "grey.100",
        overflow: "hidden",
      }}
    >
      {/* canvas */}
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Paper
          variant="outlined"
          sx={{ flexGrow: 1, display: "flex", flexDirection: "column", borderRadius: 2, overflow: "hidden" }}
        >
        <Box
          sx={{
            display: "flex",
            gap: 1,
            px: 2,
            py: 1.25,
            alignItems: "center",
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "#fff",
          }}
        >
          <Tooltip title="Back to maps">
            <IconButton size="small" onClick={() => navigate("/maps")}>
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {mapName}
          </Typography>
          <Chip size="small" label={mapCategory} variant="outlined" sx={{ height: 22 }} />
          <Chip size="small" label={`${nodes.length} nodes · ${edges.length} edges`} variant="outlined" sx={{ height: 22 }} />
          {dirty && <Chip size="small" label="unsaved changes" color="warning" />}
          <Box sx={{ flexGrow: 1 }} />
          {(selectedNode || selectedEdge) && (
            <Tooltip title="Delete selected">
              <IconButton color="error" onClick={deleteSelected}>
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          )}
          <Button variant="outlined" startIcon={<CodeIcon />} onClick={() => setYamlOpen(true)}>
            YAML
          </Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={saveGraph} disabled={saving || !dirty}>
            {saving ? "Saving…" : "Save graph"}
          </Button>
        </Box>
        {loadError && (
          <Typography variant="body2" color="error" sx={{ px: 2, py: 1 }}>
            {loadError}
          </Typography>
        )}
        <Box ref={wrapperRef} sx={{ flexGrow: 1, position: "relative" }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={(c) => {
              onNodesChange(c);
              if (c.some((x: any) => x.type !== "select")) markDirty();
            }}
            onEdgesChange={(c) => {
              onEdgesChange(c);
              if (c.some((x: any) => x.type !== "select")) markDirty();
            }}
            onConnect={onConnect}
            onInit={setRfInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onSelectionChange={onSelectionChange}
            onNodeDragStop={markDirty}
            defaultEdgeOptions={{ type: "smoothstep", style: { strokeWidth: 2 } }}
            connectionLineStyle={{ strokeWidth: 2 }}
            fitView
            fitViewOptions={{ padding: 0.3, maxZoom: 0.75 }}
            minZoom={0.2}
            maxZoom={1.5}
          >
            <Background variant={BackgroundVariant.Dots} gap={18} size={1.5} />
            <Controls />
            <MiniMap
              nodeColor={(n: any) => typeColor(n.data?.nodeType)}
              maskColor="rgba(240, 240, 240, 0.75)"
              pannable
              zoomable
            />
          </ReactFlow>

          {/* floating node palette — overlays the canvas area (below the toolbar) */}
          <Paper
            elevation={6}
            sx={{
              position: "absolute",
              top: 16,
              left: 16,
              zIndex: 6,
              p: 0.75,
              borderRadius: 999,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 0.5,
              maxHeight: "calc(100% - 32px)",
            }}
          >
            <Tooltip title={paletteOpen ? "Collapse palette" : "Node palette — drag onto canvas"} placement="right" arrow>
              <IconButton size="small" onClick={() => setPaletteOpen((o) => !o)} sx={{ color: "text.secondary" }}>
                {paletteOpen ? <ChevronLeftIcon fontSize="small" /> : <DragIndicatorIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            {paletteOpen && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, overflowY: "auto", px: 0.25 }}>
                {PALETTE.map((t) => {
                  const c = typeColor(t);
                  return (
                    <Tooltip key={t} title={`${t} — ${TYPE_HINTS[t]}`} placement="right" arrow>
                      <Box
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("application/jevflow-nodetype", t)}
                        sx={{
                          width: 42,
                          height: 42,
                          borderRadius: 2,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: c,
                          bgcolor: `${c}14`,
                          cursor: "grab",
                          userSelect: "none",
                          border: "1px solid transparent",
                          transition: "background .15s ease, border-color .15s ease, box-shadow .15s ease",
                          "&:hover": { bgcolor: `${c}22`, borderColor: c, boxShadow: `0 2px 10px ${c}33` },
                          "&:active": { cursor: "grabbing" },
                        }}
                      >
                        {TYPE_ICONS[t]}
                      </Box>
                    </Tooltip>
                  );
                })}
              </Box>
            )}
          </Paper>
          {!loading && nodes.length === 0 && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <Paper sx={{ p: 3, textAlign: "center", opacity: 0.96 }}>
                <Typography variant="h6">Empty map</Typography>
                <Typography variant="body2" color="text.secondary">
                  Drag node types from the left palette to start drawing.
                  <br />
                  The live YAML equivalent is in the right sidebar.
                </Typography>
              </Paper>
            </Box>
          )}
        </Box>
        {loading && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 1.5 }}>
            Loading graph…
          </Typography>
        )}
        </Paper>
      </Box>

      {/* right sidebar: Inspector / Live YAML tabs */}
      <Paper
        variant="outlined"
        sx={{
          width: 420,
          minWidth: 420,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRadius: 2,
          flexShrink: 0,
        }}
      >
        <Tabs
          value={sideTab}
          onChange={(_e, v) => setSideTab(v)}
          variant="fullWidth"
          sx={{ borderBottom: "1px solid", borderColor: "divider", minHeight: 46 }}
        >
          <Tab label="Inspector" sx={{ minHeight: 46, textTransform: "none", fontWeight: 600 }} />
          <Tab label="Test" sx={{ minHeight: 46, textTransform: "none", fontWeight: 600 }} />
          <Tab
            label={dirty ? "YAML •" : "YAML"}
            sx={
              dirty
                ? { minHeight: 46, textTransform: "none", fontWeight: 700, color: "warning.main" }
                : { minHeight: 46, textTransform: "none", fontWeight: 600 }
            }
          />
        </Tabs>
        {sideTab === 0 && (
          <Box sx={{ p: 2.5, overflowY: "auto" }}>
        {!selectedNode && !selectedEdge && (
          <Box sx={{ py: 2, px: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: "text.primary" }}>
              Map details
            </Typography>
            <TextField
              label="Name"
              fullWidth
              size="small"
              margin="normal"
              value={mapName}
              onChange={(e) => { setMapName(e.target.value); markDirty(); }}
            />
            <TextField
              label="Version"
              fullWidth
              size="small"
              margin="normal"
              value={mapVersion}
              onChange={(e) => { setMapVersion(e.target.value); markDirty(); }}
            />
            <TextField
              select
              label="Category"
              fullWidth
              size="small"
              margin="normal"
              value={mapCategory}
              onChange={(e) => { setMapCategory(e.target.value); markDirty(); }}
              helperText="How this map is triggered"
            >
              {["manual", "webhook", "schedule", "event"].map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
            <Button
              fullWidth
              variant="contained"
              size="small"
              sx={{ mt: 2 }}
              onClick={async () => {
                try {
                  await mapReq.saveItem(String(mapId), { name: mapName, version: mapVersion, category: mapCategory });
                  setDirty(false);
                } catch (e: any) {
                  setLoadError(e?.response?.data?.detail || e?.message || "Save failed");
                }
              }}
            >
              Save map details
            </Button>
            <Typography variant="body2" sx={{ mt: 3, color: "text.secondary" }}>
              Select a node or edge to edit it. Drag nodes to move them, drag between handles to connect.
            </Typography>
          </Box>
        )}
        {selectedNode && (
          <Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                mb: 2,
                p: 1.25,
                borderRadius: 2,
                bgcolor: `${typeColor(selectedNode.data.nodeType)}12`,
                border: "1px solid",
                borderColor: `${typeColor(selectedNode.data.nodeType)}33`,
              }}
            >
              <Box sx={{ color: typeColor(selectedNode.data.nodeType), display: "flex" }}>
                {TYPE_ICONS[selectedNode.data.nodeType]}
              </Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: "capitalize" }}>
                {selectedNode.data.nodeType}
              </Typography>
              <Box sx={{ flexGrow: 1 }} />
              <Chip
                size="small"
                label={cfg?.qtype || "node"}
                variant="outlined"
                sx={{ height: 20, fontSize: 11 }}
              />
            </Box>
            <TextField label="Key" fullWidth size="small" margin="normal" value={selectedNode.data.key} disabled />
            <TextField
              label="Title"
              fullWidth
              size="small"
              margin="normal"
              value={nodeTitle}
              onChange={(e) => setNodeTitle(e.target.value)}
            />
            {(ntype === "classification" || ntype === "decision") && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Options — matched against the trigger state by keywords
                </Typography>
                {choiceOptions.map((opt, i) => (
                  <Box key={`${opt}-${i}`} sx={{ display: "flex", gap: 1, alignItems: "center", mt: 1.5 }}>
                    <TextField
                      size="small"
                      label="Option"
                      value={opt}
                      onChange={(e) => updateOption(i, e.target.value)}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      size="small"
                      label="Keywords (comma)"
                      value={(choiceKeywords[opt] || []).join(", ")}
                      onChange={(e) => updateOptionKeywords(opt, e.target.value)}
                      sx={{ flex: 1.4 }}
                    />
                    <IconButton size="small" color="error" onClick={() => removeOption(i)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
                <Button size="small" startIcon={<AddIcon />} onClick={addOption} sx={{ mt: 1.5 }}>
                  Add option
                </Button>
              </Box>
            )}

            {ntype === "rule" && (
              <TextField
                label="Proposition (noul)"
                fullWidth
                size="small"
                margin="normal"
                multiline
                minRows={2}
                value={noulText}
                onChange={(e) => setInstructions(e.target.value)}
                helperText="Belief 0–1 from positive/negative cues in the trigger state."
              />
            )}

            {ntype === "prioritization" && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Weighted criteria (0–1) with keywords
                </Typography>
                {criterionNames.map((name) => (
                  <Box key={name} sx={{ display: "flex", gap: 1, alignItems: "center", mt: 1.5 }}>
                    <TextField
                      size="small"
                      label="Criterion"
                      value={name}
                      onChange={(e) => renameCriterion(name, e.target.value)}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      size="small"
                      type="number"
                      label="Weight"
                      value={weights[name] ?? 0}
                      onChange={(e) => setWeight(name, Number(e.target.value))}
                      sx={{ width: 92 }}
                      inputProps={{ step: 0.1, min: 0, max: 1 }}
                    />
                    <TextField
                      size="small"
                      label="Keywords (comma)"
                      value={(rubricKw[name] || []).join(", ")}
                      onChange={(e) => setCriterionKeywords(name, e.target.value)}
                      sx={{ flex: 1.4 }}
                    />
                    <IconButton size="small" color="error" onClick={() => removeCriterion(name)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
                <Button size="small" startIcon={<AddIcon />} onClick={addCriterion} sx={{ mt: 1.5 }}>
                  Add criterion
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2.5 }}>
                  Levels — score ≥ threshold → label
                </Typography>
                {levels.map((lv, i) => (
                  <Box key={i} sx={{ display: "flex", gap: 1, alignItems: "center", mt: 1.5 }}>
                    <TextField
                      size="small"
                      type="number"
                      label="≥ threshold"
                      value={Number(lv[0])}
                      onChange={(e) => setLevel(i, Number(e.target.value), String(lv[1]))}
                      sx={{ width: 116 }}
                    />
                    <TextField
                      size="small"
                      label="Label"
                      value={String(lv[1])}
                      onChange={(e) => setLevel(i, Number(lv[0]), e.target.value)}
                      sx={{ flex: 1 }}
                    />
                    <IconButton size="small" color="error" onClick={() => removeLevel(i)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
                <Button size="small" startIcon={<AddIcon />} onClick={addLevel} sx={{ mt: 1.5 }}>
                  Add level
                </Button>
              </Box>
            )}

            {ntype === "trigger" && (
              <TextField
                label="Event"
                fullWidth
                size="small"
                margin="normal"
                value={cfg?.event || ""}
                onChange={(e) => setEvent(e.target.value)}
                helperText="Real event name this trigger responds to, e.g. employee.hired or issue.created"
                placeholder="employee.hired"
              />
            )}

            {ntype === "approval" && (
              <>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5, mt: 1 }}>
                  Approval tool — channel notified with the review link
                </Typography>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Approval tool (notifies)"
                  value={cfg?.approval_tool ? String(cfg.approval_tool) : ""}
                  onChange={(e) => selectApprovalTool(e.target.value)}
                  helperText="Bind this node to a channel (email, Slack, Teams, WhatsApp)"
                >
                  <MenuItem value="">— none —</MenuItem>
                  {approvalTools.map((t: any) => (
                    <MenuItem key={t.id} value={String(t.id)}>
                      {t.tool_type} · {t.via}
                    </MenuItem>
                  ))}
                </TextField>
                <Button size="small" startIcon={<AddIcon />} onClick={() => setToolDialogOpen(true)} sx={{ mt: 1 }}>
                  New approval tool
                </Button>
                {selectedApprovalTool && (
                  <Paper variant="outlined" sx={{ mt: 1.5, p: 1.5, borderRadius: 2, bgcolor: "grey.50" }}>
                    <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                      <Chip
                        size="small"
                        label={selectedApprovalTool.tool_type}
                        color="secondary"
                        sx={{ height: 20, fontSize: 11 }}
                      />
                      <Chip
                        size="small"
                        label={selectedApprovalTool.via}
                        variant="outlined"
                        sx={{ height: 20, fontSize: 11 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {selectedApprovalTool.status}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                      Sends via {selectedApprovalTool.via === "hook" ? "the bound outbound hook" : "the bound integration's channel"}. The
                      human gets the review link, logs in, then approves or declines.
                    </Typography>
                  </Paper>
                )}
                <TextField
                  label="Tool"
                  fullWidth
                  size="small"
                  margin="normal"
                  value={cfg?.tool || ""}
                  onChange={(e) => setTool(e.target.value)}
                />
                <TextField
                  label="Action"
                  fullWidth
                  size="small"
                  margin="normal"
                  value={cfg?.action || ""}
                  onChange={(e) => setActionName(e.target.value)}
                />
                <TextField
                  label="Deny tools (comma)"
                  fullWidth
                  size="small"
                  margin="normal"
                  value={(cfg?.policy?.deny_tools || []).join(", ")}
                  onChange={(e) => setDenyTools(e.target.value)}
                />
                <FormControlLabel
                  control={<Checkbox checked={!!cfg?.policy?.strict} onChange={(e) => setStrict(e.target.checked)} />}
                  label="Strict — deny destructive tools without review"
                />
              </>
            )}

            {ntype === "action" && (
              <TextField
                label="Action"
                fullWidth
                size="small"
                margin="normal"
                value={cfg?.action || ""}
                onChange={(e) => setActionName(e.target.value)}
                helperText="Free label, or http_post for outgoing calls."
              />
            )}

            {ntype === "llm_agent" && (
              <>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5, mt: 1 }}>
                  Prompt is rendered with {"{{trigger.*}}"} / {"{{answers.*}}"} — branch on the returned answer
                </Typography>
                <TextField
                  label="Prompt"
                  fullWidth
                  size="small"
                  margin="normal"
                  multiline
                  minRows={3}
                  value={cfg?.prompt || ""}
                  onChange={(e) => setPrompt(e.target.value)}
                  helperText='e.g. Triage: {{trigger.summary}} — answer with one word'
                />
                <TextField
                  label="System prompt"
                  fullWidth
                  size="small"
                  margin="normal"
                  multiline
                  minRows={2}
                  value={cfg?.system || ""}
                  onChange={(e) => setSystem(e.target.value)}
                  helperText="Optional system message"
                />
                <TextField
                  label="Model"
                  fullWidth
                  size="small"
                  margin="normal"
                  value={cfg?.model || ""}
                  onChange={(e) => setModel(e.target.value)}
                  helperText="Provider model id (e.g. gpt-4o-mini)"
                />
                <TextField
                  label="Default answer"
                  fullWidth
                  size="small"
                  margin="normal"
                  value={cfg?.default_answer || ""}
                  onChange={(e) => setDefaultAnswer(e.target.value)}
                  helperText="Used when the call fails or dry_run — keeps edges branching"
                />
                <TextField
                  label="Response path"
                  fullWidth
                  size="small"
                  margin="normal"
                  value={cfg?.response_path || ""}
                  onChange={(e) => setResponsePath(e.target.value)}
                  helperText="Dotted path into the response (blank = auto OpenAI-style extract)"
                />
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Integration (LLM endpoint)"
                  value={cfg?.integration ? String(cfg.integration) : ""}
                  onChange={(e) => setLlmIntegration(e.target.value)}
                  helperText="base_url + optional path when no hook is bound"
                >
                  <MenuItem value="">— none —</MenuItem>
                  {integrationList.map((i: any) => (
                    <MenuItem key={i.id} value={String(i.id)}>
                      {i.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Path (with integration)"
                  fullWidth
                  size="small"
                  margin="normal"
                  value={cfg?.path || ""}
                  onChange={(e) => updateConfig({ ...cfg, path: e.target.value })}
                  helperText="e.g. /v1/chat/completions (appended to integration base_url)"
                />
                <TextField
                  label="Temperature"
                  fullWidth
                  size="small"
                  margin="normal"
                  type="number"
                  inputProps={{ min: 0, max: 2, step: 0.1 }}
                  value={cfg?.temperature ?? 0}
                  onChange={(e) => setTemperature(e.target.value)}
                />
                <FormControlLabel
                  control={
                    <Checkbox checked={!!cfg?.dry_run} onChange={(e) => setDryRun(e.target.checked)} />
                  }
                  label="Dry run — use default_answer, skip the network call"
                />
              </>
            )}

            {(ntype === "action" || ntype === "trigger" || ntype === "llm_agent") && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                  {hookDirection === "inbound"
                    ? "Inbound hook — receives the trigger message"
                    : ntype === "llm_agent"
                      ? "Outbound hook — optional LLM endpoint (auth headers win)"
                      : "Outbound hook — publishes the result (required)"}
                </Typography>
                {ntype === "action" && !cfg?.webhook_endpoint && (
                  <Typography variant="caption" color="error" sx={{ display: "block", mb: 0.5 }}>
                    Bind an outbound hook below — actions cannot save without one.
                  </Typography>
                )}
                {ntype === "llm_agent" && !cfg?.webhook_endpoint && !cfg?.integration && (
                  <Typography variant="caption" color="error" sx={{ display: "block", mb: 0.5 }}>
                    Bind an outbound hook OR an integration below — or enable dry_run for previews.
                  </Typography>
                )}
                <TextField
                  select
                  fullWidth
                  size="small"
                  label={hookDirection === "inbound" ? "Inbound hook (receives)" : "Outbound hook (posts)"}
                  value={cfg?.webhook_endpoint ? String(cfg.webhook_endpoint) : ""}
                  onChange={(e) => selectHook(e.target.value)}
                  helperText={`Bind this node to a defined ${hookDirection} hook`}
                >
                  <MenuItem value="">— none (raw config) —</MenuItem>
                  {nodeHooks.map((h: any) => (
                    <MenuItem key={h.id} value={String(h.id)}>
                      {h.source} · {h.integration_name || `integration ${h.integration}`} · {h.target_path}
                    </MenuItem>
                  ))}
                </TextField>
                <Button size="small" startIcon={<AddIcon />} onClick={openHookDialog} sx={{ mt: 1 }}>
                  New {hookDirection} hook
                </Button>
                {selectedHook && (
                  <Paper variant="outlined" sx={{ mt: 1.5, p: 1.5, borderRadius: 2, bgcolor: "grey.50" }}>
                    <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                      <Chip
                        size="small"
                        label={selectedHook.direction}
                        color={selectedHook.direction === "inbound" ? "info" : "secondary"}
                        sx={{ height: 20, fontSize: 11 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {selectedHook.integration_name || `integration ${selectedHook.integration}`}
                      </Typography>
                    </Box>
                    {selectedHook.direction === "inbound" && (
                      <>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                          Inbound URL — add this in {selectedHook.source}
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                          <Typography
                            variant="caption"
                            sx={{ fontFamily: "monospace", fontSize: 11, wordBreak: "break-all", flexGrow: 1 }}
                          >
                            {selectedHook.inbound_url}
                          </Typography>
                          <Tooltip title="Copy URL">
                            <IconButton
                              size="small"
                              onClick={() => navigator.clipboard?.writeText(selectedHook.inbound_url)}
                            >
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </>
                    )}
                    <Box sx={{ display: "flex", gap: 0.5, mt: 1, flexWrap: "wrap" }}>
                      <Chip
                        size="small"
                        variant="outlined"
                        color={selectedHook.auth_required ? "success" : "default"}
                        label={selectedHook.auth_required ? "inbound: auth required" : "inbound: open"}
                        sx={{ height: 20, fontSize: 11 }}
                      />
                      <Chip
                        size="small"
                        variant="outlined"
                        color={
                          selectedHook.outbound_auth && selectedHook.outbound_auth !== "none" ? "success" : "default"
                        }
                        label={`outbound: ${selectedHook.outbound_auth || "none"}`}
                        sx={{ height: 20, fontSize: 11 }}
                      />
                    </Box>
                    {selectedHook.auth_required && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                        Inbound calls must send the hook secret via <code>X-JevFlow-Secret</code>,{" "}
                        <code>Authorization: Bearer</code>, or an HMAC-SHA256 body signature.
                      </Typography>
                    )}
                    {selectedHook.outbound_url && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                        Outbound target: <code>{selectedHook.outbound_url}</code>
                        {selectedHook.outbound_auth && selectedHook.outbound_auth !== "none"
                          ? ` — authenticated with the ${selectedHook.integration_name} credentials (${selectedHook.outbound_auth}).`
                          : " — no integration credentials configured."}
                      </Typography>
                    )}
                  </Paper>
                )}
              </Box>
            )}

            <Accordion
              disableGutters
              elevation={0}
              sx={{
                mt: 2,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                "&:before": { display: "none" },
                "&.Mui-expanded": { margin: 0, mt: 2 },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 42 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Advanced — JSON
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <TextField
                  label="Config (JSON)"
                  fullWidth
                  size="small"
                  multiline
                  minRows={5}
                  value={nodeConfigText}
                  onChange={(e) => onConfigTextChange(e.target.value)}
                  error={!!nodeConfigError}
                  helperText={nodeConfigError || "Mirrors the form above"}
                />
              </AccordionDetails>
            </Accordion>
            <Button fullWidth variant="contained" size="medium" onClick={applyNodeConfig} sx={{ mt: 2 }}>
              Apply changes
            </Button>
            {selectedNode.data.nodeType === "action" && (
              <Button
                fullWidth
                size="small"
                variant="outlined"
                sx={{ mt: 1 }}
                onClick={() =>
                  updateConfig({
                    ...cfg,
                    action: "http_post",
                    method: "POST",
                    url: "https://jira.example.com/rest/api/3/issue/{{trigger.issue.key}}/comment",
                    headers: { "Content-Type": "application/json" },
                    body: {
                      body: "Decided {{answers.decide}} via {{answers._route}}.",
                    },
                    dry_run: true,
                  })
                }
              >
                Insert HTTP POST template
              </Button>
            )}
            {selectedNode.data.nodeType === "llm_agent" && (
              <Button
                fullWidth
                size="small"
                variant="outlined"
                sx={{ mt: 1 }}
                onClick={() =>
                  updateConfig({
                    ...cfg,
                    prompt:
                      "Triage this change and answer with one word: proceed, review, or block.\n\nSummary: {{trigger.summary}}\nPriority: {{trigger.priority}}",
                    system: "Answer with a single lowercase word only.",
                    model: cfg?.model || "gpt-4o-mini",
                    default_answer: cfg?.default_answer || "review",
                    response_path: cfg?.response_path || "",
                    dry_run: cfg?.dry_run ?? true,
                  })
                }
              >
                Insert LLM template
              </Button>
            )}
          </Box>
        )}
        {selectedEdge && !selectedNode && (
          <Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                mb: 2,
                p: 1.25,
                borderRadius: 2,
                bgcolor: "grey.100",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Edge
              </Typography>
              <Box sx={{ flexGrow: 1 }} />
              <Chip size="small" label={`priority ${edgePriority}`} variant="outlined" sx={{ height: 20, fontSize: 11 }} />
            </Box>
            <TextField
              label="Label"
              fullWidth
              size="small"
              margin="normal"
              value={edgeLabel}
              onChange={(e) => setEdgeLabel(e.target.value)}
            />
            <TextField
              label="Priority"
              type="number"
              fullWidth
              size="small"
              margin="normal"
              value={edgePriority}
              onChange={(e) => setEdgePriority(Number(e.target.value))}
            />
            <TextField
              label="Condition (JSON)"
              fullWidth
              size="small"
              margin="normal"
              multiline
              minRows={4}
              value={edgeConditionText}
              onChange={(e) => setEdgeConditionText(e.target.value)}
              error={!!edgeError}
              helperText={edgeError || undefined}
            />
            <Button fullWidth variant="contained" size="medium" onClick={applyEdgeConfig} sx={{ mt: 2 }}>
              Apply changes
            </Button>
          </Box>
        )}
          </Box>
        )}
        {sideTab === 1 && (
          <Box sx={{ p: 2.5, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1.25, flexGrow: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Test run
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Provide a trigger state (JSON). The engine walks the graph and returns answers, route, confidence and a
              trace.
            </Typography>
            <TextField
              label="Trigger state (JSON)"
              multiline
              minRows={8}
              fullWidth
              size="small"
              value={runState}
              onChange={(e) => setRunState(e.target.value)}
            />
            <Button fullWidth variant="contained" startIcon={<PlayArrowIcon />} onClick={runTest}>
              Run Test
            </Button>
            {runResult && (
              <Paper
                variant="outlined"
                sx={{ p: 1.5, background: "#f7f8fa", maxHeight: 360, overflow: "auto", borderRadius: 2 }}
              >
                <Typography
                  variant="caption"
                  component="pre"
                  sx={{ whiteSpace: "pre-wrap", m: 0, fontFamily: "monospace", fontSize: 11, lineHeight: 1.45 }}
                >
                  {JSON.stringify(runResult, null, 2)}
                </Typography>
              </Paper>
            )}
          </Box>
        )}
        {sideTab === 2 && (
          <Box sx={{ p: 2.5, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1.25, flexGrow: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Live YAML
              </Typography>
              <Box sx={{ flexGrow: 1 }} />
              {dirty ? (
                <Chip size="small" label="unsaved" color="warning" sx={{ height: 20, fontSize: 11 }} />
              ) : (
                <Chip size="small" label="saved" color="success" sx={{ height: 20, fontSize: 11 }} />
              )}
            </Box>
            <Typography variant="caption" color="text.secondary">
              Mirror of the canvas — also shown for brand-new maps before the first save. Save graph persists it to
              the database.
            </Typography>
            <Paper
              sx={{
                p: 1.5,
                background: "#1e1e1e",
                flexGrow: 1,
                overflow: "auto",
                minHeight: 220,
                borderRadius: 2,
                cursor: "pointer",
              }}
              elevation={0}
              onClick={() => setYamlOpen(true)}
            >
              <Typography
                variant="caption"
                component="pre"
                sx={{ m: 0, whiteSpace: "pre", fontFamily: "monospace", fontSize: 11, color: "#d4d4d4", cursor: "pointer" }}
              >
                {liveYaml}
              </Typography>
            </Paper>
            <Button
              fullWidth
              size="small"
              variant="outlined"
              startIcon={<CodeIcon />}
              onClick={() => {
                setYamlDraft(specYaml || liveYaml);
                setYamlOpen(true);
              }}
            >
              Open full YAML
            </Button>
          </Box>
        )}
      </Paper>

      {/* new integration hook dialog */}
      <Dialog open={hookDialogOpen} onClose={() => setHookDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>New {hookDialogDirection} hook</DialogTitle>
        <DialogContent>
          {hookDialogDirection === "inbound" && (
            <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2, bgcolor: "grey.50" }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                Inbound hooks share one fixed URL — give this plus the secret to the customer
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Typography
                  variant="caption"
                  sx={{ fontFamily: "monospace", fontSize: 11, wordBreak: "break-all", flexGrow: 1 }}
                >
                  POST /api/webhook-endpoint/receive/
                </Typography>
                <Tooltip title="Copy URL">
                  <IconButton
                    size="small"
                    onClick={() => navigator.clipboard?.writeText("/api/webhook-endpoint/receive/")}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Paper>
          )}
          <WebhookEndpointForm
            includeFields={
              hookDialogDirection === "inbound"
                ? ["integration", "source", "secret"]
                : ["integration", "source", "target_url", "auth_scheme", "auth_username", "auth_token"]
            }
            initialData={{
              integration: mapIntegrationId ?? undefined,
              direction: hookDialogDirection,
              source: "jira",
              is_active: true,
              status: "activated",
            }}
            onSave={handleHookSaved}
          />
        </DialogContent>
      </Dialog>

      {/* new approval tool dialog */}
      <Dialog open={toolDialogOpen} onClose={() => setToolDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>New approval tool</DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
            A channel the human is notified on — email, Slack, Teams or WhatsApp, with the review link.
          </Typography>
          <ApprovalToolForm
            includeFields={["name", "description", "tool_type", "via", "integration", "webhook_endpoint", "status"]}
            initialData={{ tool_type: "message", via: "integration", status: "activated" }}
            onSave={handleToolSaved}
          />
        </DialogContent>
      </Dialog>

      {/* YAML drawer */}
      <Drawer anchor="right" open={yamlOpen} onClose={() => setYamlOpen(false)}>
        <Box sx={{ width: 560, p: 2.5, display: "flex", flexDirection: "column", gap: 1.25, height: "100%" }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography variant="h6">Map YAML (stored in DB)</Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Tooltip title="Copy">
              <IconButton onClick={() => navigator.clipboard?.writeText(yamlDraft)}>
                <ContentCopyIcon />
              </IconButton>
            </Tooltip>
            <IconButton onClick={() => setYamlOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Typography variant="caption" color="text.secondary">
            This is the canonical spec — every graphical save regenerates it in the database. Edit below and import to
            rebuild the graph.
          </Typography>
          <TextField
            multiline
            fullWidth
            minRows={20}
            value={yamlDraft}
            onChange={(e) => setYamlDraft(e.target.value)}
            sx={{ fontFamily: "monospace", flexGrow: 1 }}
            inputProps={{ style: { fontFamily: "monospace", fontSize: 12 } }}
          />
          {yamlError && (
            <Typography variant="body2" color="error">
              {yamlError}
            </Typography>
          )}
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              onClick={() => {
                setYamlDraft(specYaml);
                setYamlError("");
              }}
            >
              Reset
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            <Button variant="contained" onClick={importYaml}>
              Import YAML → rebuild graph
            </Button>
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
};

export default DecisionMapEditor;
