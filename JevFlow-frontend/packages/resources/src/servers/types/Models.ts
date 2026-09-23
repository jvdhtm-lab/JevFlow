// Auto-generated from Swagger — do not edit by hand. Run `npm run buildResources` in packages/cli.
export interface Account {
  id?: number;
  name?: string | null;
  slug?: string;
  description?: string | null;
  is_active?: boolean;
  status?: 'activated' | 'deactivated' | 'pending' | 'confirmed' | 'archived';
}
export interface App {
  id?: number;
  title?: string;
  pathUrl?: string;
  entity_name?: string;
  is_global?: boolean;
  status?: 'activated' | 'deactivated' | 'pending' | 'confirmed' | 'archived';
}
export interface ApprovalRequest {
  id?: number;
  name?: string | null;
  description?: string | null;
  map?: number;
  run?: number | null;
  node_key?: string;
  approval_tool?: number | null;
  token?: string;
  status?: 'pending' | 'approved' | 'declined';
  payload?: Record<string, unknown> | null;
  decided_by?: number;
  decided_at?: string;
  review_url?: string;
  account?: number | null;
  created_date_time?: string;
  updated_date_time?: string;
}
export interface ApprovalTool {
  id?: number;
  name?: string | null;
  description?: string | null;
  tool_type?: 'smtp_email' | 'slack_channel' | 'teams' | 'whatsapp';
  target?: string;
  config?: Record<string, unknown> | null;
  is_active?: boolean;
  account?: number | null;
  status?: 'activated' | 'deactivated' | 'pending' | 'confirmed' | 'archived';
  created_date_time?: string;
  updated_date_time?: string;
}
export interface AuditLog {
  id?: number;
  user?: number | null;
  action?:
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'VIEW'
    | 'LOGIN'
    | 'LOGOUT'
    | 'WEBHOOK'
    | 'DECISION';
  model_name?: string;
  object_id?: number | null;
  object_repr?: string | null;
  changes?: Record<string, unknown> | null;
  timestamp?: string;
  ip_address?: string | null;
  user_agent?: string | null;
}
export interface Login {
  email?: string;
  password?: string;
  user?: number;
}
export interface DecisionEdge {
  id?: number;
  name?: string | null;
  description?: string | null;
  map?: number;
  source?: number;
  target?: number;
  label?: string | null;
  condition?: Record<string, unknown> | null;
  priority?: number;
  status?: 'activated' | 'deactivated' | 'pending' | 'confirmed' | 'archived';
  created_date_time?: string;
  updated_date_time?: string;
}
export interface DecisionMap {
  id?: number;
  name?: string | null;
  description?: string | null;
  integration?: number | null;
  version?: string;
  is_active?: boolean;
  layout?: Record<string, unknown> | null;
  spec_yaml?: string;
  trigger_source?: 'webhook' | 'manual' | 'schedule' | 'event';
  account?: number | null;
  status?: 'activated' | 'deactivated' | 'pending' | 'confirmed' | 'archived';
  created_date_time?: string;
  updated_date_time?: string;
}
export interface DecisionNode {
  id?: number;
  name?: string | null;
  description?: string | null;
  map?: number;
  node_key?: string;
  node_type?:
    | 'trigger'
    | 'rule'
    | 'classification'
    | 'prioritization'
    | 'decision'
    | 'action'
    | 'branch'
    | 'approval';
  title?: string | null;
  config?: Record<string, unknown> | null;
  position_x?: number;
  position_y?: number;
  status?: 'activated' | 'deactivated' | 'pending' | 'confirmed' | 'archived';
  created_date_time?: string;
  updated_date_time?: string;
}
export interface DecisionRun {
  id?: number;
  name?: string | null;
  description?: string | null;
  map?: number;
  trigger_event?: Record<string, unknown> | null;
  status?: 'pending' | 'running' | 'decided' | 'escalated' | 'failed';
  answers?: Record<string, unknown> | null;
  decided_route?: string | null;
  confidence?: number | null;
  executed_action?: string | null;
  action_results?: Record<string, unknown> | null;
  error?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  created_date_time?: string;
  updated_date_time?: string;
}
export interface EngineCall {
  id?: number;
  name?: string | null;
  description?: string | null;
  preset?: number | null;
  map?: number | null;
  state?: Record<string, unknown> | null;
  questions?: Record<string, unknown> | null;
  answers?: Record<string, unknown>;
  latency_ms?: number;
  created_by?: number | null;
  status?: 'activated' | 'deactivated' | 'pending' | 'confirmed' | 'archived';
  created_date_time?: string;
  updated_date_time?: string;
}
export interface EnginePreset {
  id?: number;
  name?: string | null;
  description?: string | null;
  preset_type?:
    | 'route'
    | 'model-route'
    | 'tool-guard'
    | 'research'
    | 'completion'
    | 'custom';
  model?: string;
  config?: Record<string, unknown> | null;
  status?: 'activated' | 'deactivated' | 'pending' | 'confirmed' | 'archived';
  created_date_time?: string;
  updated_date_time?: string;
}
export interface Integration {
  id?: number;
  name?: string | null;
  description?: string | null;
  purpose?: 'user_auth' | 'action_trigger';
  integration_type?:
    | 'jira'
    | 'github'
    | 'gitlab'
    | 'slack'
    | 'teams'
    | 'aws'
    | 'gcp'
    | 'azure_cloud'
    | 'codex'
    | 'openai_codex'
    | 'slack_app'
    | 'outlook'
    | 'generic_webhook';
  base_url?: string | null;
  connection_status?: 'connected' | 'disconnected' | 'error' | 'pending';
  config?: Record<string, unknown> | null;
  credentials_hint?: string | null;
  owner?: number | null;
  last_sync_at?: string | null;
  last_error?: string | null;
  account?: number | null;
  status?: 'activated' | 'deactivated' | 'pending' | 'confirmed' | 'archived';
  created_date_time?: string;
  updated_date_time?: string;
}
export interface LoginRecord {
  id?: number;
  user?: number;
  timestamp?: string;
  provider?: 'local' | 'google' | 'github' | 'x' | 'outlook' | 'slack';
  ip?: string | null;
  status?: 'activated' | 'deactivated' | 'pending' | 'confirmed' | 'archived';
}
export interface Notification {
  id?: number;
  recipient?: number;
  title?: string;
  message?: string;
  notification_type?:
    | 'integration_connected'
    | 'integration_error'
    | 'webhook_received'
    | 'decision_made'
    | 'decision_escalated'
    | 'approval_needed'
    | 'system';
  is_read?: boolean;
  read_at?: string | null;
  related_object_type?: string | null;
  related_object_id?: number | null;
  action_url?: string | null;
  created_at?: string;
}
export interface OAuthProvider {
  id?: number;
  provider?: 'local' | 'google' | 'github' | 'x' | 'outlook' | 'slack';
  client_id?: string;
  client_secret?: string;
  is_active?: boolean;
  configured?: string;
  config?: Record<string, unknown> | null;
  status?: 'activated' | 'deactivated' | 'pending' | 'confirmed' | 'archived';
}
export interface Role {
  id?: number;
  title?: string;
  user?: number;
  permission?: 'R' | 'W' | 'RW' | 'RWD';
  app?: number;
  account?: number | null;
}
export interface SocialAccount {
  id?: number;
  user?: number;
  provider?: 'local' | 'google' | 'github' | 'x' | 'outlook' | 'slack';
  provider_uid?: string;
  extra_data?: Record<string, unknown> | null;
  access_token?: string | null;
  refresh_token?: string | null;
  expires_at?: string | null;
  status?: 'activated' | 'deactivated' | 'pending' | 'confirmed' | 'archived';
}
export interface SyncLog {
  id?: number;
  name?: string | null;
  description?: string | null;
  integration?: number | null;
  direction?: 'in' | 'out';
  event_type?: string;
  payload?: Record<string, unknown> | null;
  result?: 'success' | 'error' | 'skipped';
  error_msg?: string | null;
  duration_ms?: number | null;
  account?: number | null;
  status?: 'activated' | 'deactivated' | 'pending' | 'confirmed' | 'archived';
  created_date_time?: string;
  updated_date_time?: string;
}
export interface User {
  id?: number;
  username?: string;
  email?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  account?: number | null;
  auth_provider?: 'local' | 'google' | 'github' | 'x' | 'outlook' | 'slack';
  avatar_url?: string | null;
  is_active?: boolean;
  is_staff?: boolean;
  status?: 'activated' | 'deactivated' | 'pending' | 'confirmed' | 'archived';
}
export interface WebhookEndpoint {
  id?: number;
  name?: string | null;
  description?: string | null;
  integration?: number;
  integration_name?: string;
  integration_type?: string;
  integration_base_url?: string;
  direction?: 'inbound' | 'outbound';
  secret?: string | null;
  source?: 'jira' | 'github' | 'ci' | 'slack' | 'teams' | 'generic';
  target_path?: string;
  target_url?: string | null;
  auth_scheme?: 'none' | 'bearer' | 'basic';
  auth_username?: string | null;
  is_active?: boolean;
  last_received_at?: string | null;
  inbound_url?: string;
  outbound_url?: string;
  auth_required?: string;
  outbound_auth?: string;
  account?: number | null;
  status?: 'activated' | 'deactivated' | 'pending' | 'confirmed' | 'archived';
  created_date_time?: string;
  updated_date_time?: string;
}
export interface definitions {
  Account: Account;
  App: App;
  ApprovalRequest: ApprovalRequest;
  ApprovalTool: ApprovalTool;
  AuditLog: AuditLog;
  Login: Login;
  DecisionEdge: DecisionEdge;
  DecisionMap: DecisionMap;
  DecisionNode: DecisionNode;
  DecisionRun: DecisionRun;
  EngineCall: EngineCall;
  EnginePreset: EnginePreset;
  Integration: Integration;
  LoginRecord: LoginRecord;
  Notification: Notification;
  OAuthProvider: OAuthProvider;
  Role: Role;
  SocialAccount: SocialAccount;
  SyncLog: SyncLog;
  User: User;
  WebhookEndpoint: WebhookEndpoint;
}
