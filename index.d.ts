// Ogma Plugin SDK -- TypeScript type definitions
// These types describe the sdk object passed to your plugin's init() function.
// The actual implementation is provided by the Ogma runtime at plugin load time.
//
// Usage:
//   import type { OgmaBackendSdk, HttpRequest, HttpResponse } from '@kaijinlab/ogma-sdk';
//
//   async function init(sdk: OgmaBackendSdk): Promise<void> {
//     sdk.events.onInterceptRequest(async (req) => {
//       sdk.console.log(req.getHost());
//     });
//   }
//   (globalThis as any).init = init;

// ---------------------------------------------------------------------------
// HTTP objects
// ---------------------------------------------------------------------------

/** Represents an HTTP body. Returned by getBody() methods. */
export declare class Body {
  /** The body length in bytes. */
  readonly length: number;
  /** Returns the full body text. */
  toText(): string;
  /** Parses and returns the body as JSON. Throws if not valid JSON. */
  toJson(): unknown;
  /** Returns raw bytes as a Uint8Array. */
  toRaw(): Uint8Array;
}

export interface HttpRequest {
  getId(): string | null;
  getHost(): string;
  getPort(): number;
  getMethod(): string;
  getPath(): string;
  getQuery(): string;
  getUrl(): string;
  getHeaders(): Record<string, string>;
  getHeader(name: string): string | undefined;
  getBody(): Body | undefined;
}

export interface HttpResponse {
  getId(): string | null;
  /** HTTP status code, e.g. 200, 404. */
  getCode(): number;
  getHeaders(): Record<string, string>;
  getHeader(name: string): string | undefined;
  getBody(): Body | undefined;
  getRoundtripTime(): number;
  getCreatedAt(): Date | null;
}

/** A mutable request spec used to construct outbound requests via sdk.requests.send(). */
export interface RequestSpec {
  method: string;
  host: string;
  port: number;
  tls: boolean;
  path: string;
  query?: string;
  headers?: Array<[string, string]>;
  body?: string;
}

// ---------------------------------------------------------------------------
// sdk.console
// ---------------------------------------------------------------------------

export interface SdkConsole {
  log(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

// ---------------------------------------------------------------------------
// sdk.events
// ---------------------------------------------------------------------------

export interface SdkEvents {
  /** Called for every proxied HTTP request. */
  onInterceptRequest(callback: (req: HttpRequest) => void | Promise<void>): void;
  /** Called for every proxied HTTP response. resp is undefined on connection errors. */
  onInterceptResponse(callback: (req: HttpRequest, resp?: HttpResponse) => void): void;
  /** Called when the active project changes. */
  onProjectChange(callback: () => void): void;
  /** Called when a Match & Replace rule is updated. */
  onCurrentRuleChange(callback: () => void): void;
  /** Called for each upstream request, allowing modification before sending. */
  onUpstream(callback: (req: RequestSpec) => RequestSpec | void): void;
  /** Called when a new finding is created. */
  onFindingCreated(callback: (finding: Finding) => void): void;
}

// ---------------------------------------------------------------------------
// sdk.requests
// ---------------------------------------------------------------------------

export interface SearchOptions {
  /** HTTPQL query string, e.g. "host:example.com AND method:POST". */
  q?: string;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  request: HttpRequest;
  response?: HttpResponse;
}

export interface SdkRequests {
  /** Fetch a single HTTP entry by id. Returns undefined if not found. */
  get(id: string): Promise<{ request: HttpRequest; response?: HttpResponse } | undefined>;
  /** Search HTTP history. Returns matching entries. */
  search(opts?: SearchOptions): Promise<SearchResult[]>;
  /** Send an HTTP request and return the response. */
  send(spec: RequestSpec): Promise<{ response: HttpResponse }>;
}

// ---------------------------------------------------------------------------
// sdk.findings
// ---------------------------------------------------------------------------

export type FindingSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface CreateFindingSpec {
  title: string;
  severity: FindingSeverity;
  description: string;
  /** Prevents duplicate findings. If a finding with this key exists, returns it. */
  dedupe_key?: string;
  /** Links the finding to an HTTP history entry. */
  entry_id?: string;
}

export interface Finding {
  id: string;
  title: string;
  severity: FindingSeverity;
  description: string;
  dedupe_key?: string;
  entry_id?: string;
  created_at: number;
}

export interface ListFindingsOptions {
  limit?: number;
  offset?: number;
  severity?: FindingSeverity;
}

export interface SdkFindings {
  create(spec: CreateFindingSpec): Promise<Finding>;
  get(id: string): Promise<Finding | undefined>;
  list(opts?: ListFindingsOptions): Promise<{ findings: Finding[]; total: number }>;
  update(id: string, patch: Partial<CreateFindingSpec>): Promise<Finding>;
  /** Check whether a finding with the given dedupe_key already exists. */
  exists(dedupeKeyOrSpec: string | { dedupeKey: string }): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// sdk.storage
// ---------------------------------------------------------------------------

export interface SdkStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
  clear(): Promise<void>;
}

// ---------------------------------------------------------------------------
// sdk.api  (backend <-> frontend bridge)
// ---------------------------------------------------------------------------

export interface SdkApi {
  /** Register a function callable from the frontend via sdk.backend.call(name, ...args). */
  register(name: string, fn: (...args: unknown[]) => unknown | Promise<unknown>): void;
  /** Send an event to the frontend. Received via sdk.backend.onEvent(). */
  send(event: string, ...args: unknown[]): void;
}

// ---------------------------------------------------------------------------
// sdk.env  (environment variables defined in Ogma Settings > Environment)
// ---------------------------------------------------------------------------

export interface SdkEnv {
  getVar(name: string): string | undefined;
}

// ---------------------------------------------------------------------------
// sdk.scope
// ---------------------------------------------------------------------------

export interface ScopePreset {
  id: string;
  name: string;
}

export interface SdkScope {
  getActive(): Promise<ScopePreset | null>;
  inScope(url: string): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// sdk.projects
// ---------------------------------------------------------------------------

export interface OgmaProject {
  id: string;
  name: string;
}

export interface SdkProjects {
  getCurrent(): Promise<OgmaProject | null>;
}

// ---------------------------------------------------------------------------
// sdk.replay
// ---------------------------------------------------------------------------

export interface ReplaySession {
  id: string;
  name: string;
}

export interface SdkReplay {
  getSessions(): Promise<ReplaySession[]>;
  getSession(id: string): Promise<ReplaySession | undefined>;
}

// ---------------------------------------------------------------------------
// sdk.meta
// ---------------------------------------------------------------------------

export interface SdkMeta {
  /** Returns the plugin's writable data directory path on disk. */
  path(): string;
  /** Returns the plugin's unique instance ID. */
  id(): string;
  /** Returns the plugin's package ID (e.g. "com.example.my-plugin"). */
  packageId(): string;
  /** Returns the plugin's version string. */
  version(): string;
}

// ---------------------------------------------------------------------------
// sdk.console (log alias)
// ---------------------------------------------------------------------------

export interface SdkLog {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

// ---------------------------------------------------------------------------
// sdk.settings
// ---------------------------------------------------------------------------

export interface SettingsFieldSpec {
  key: string;
  label: string;
  type: 'text' | 'password' | 'number' | 'boolean' | 'select';
  default?: string | number | boolean;
  options?: Array<{ value: string; label: string }>;
  description?: string;
}

export interface SettingsPageSpec {
  title: string;
  fields: SettingsFieldSpec[];
  onSave?: (values: Record<string, unknown>) => void | Promise<void>;
}

export interface SdkSettings {
  register(spec: SettingsPageSpec): void;
  /** Get the current saved value for a registered settings field. Returns null if not set. */
  get(key: string): Promise<string | null>;
}

// ---------------------------------------------------------------------------
// sdk.theme
// ---------------------------------------------------------------------------

export interface SdkTheme {
  /** Returns the current app theme. */
  get(): 'dark' | 'light';
  /** Register a callback invoked when the app theme changes. */
  onChange(callback: (theme: 'dark' | 'light') => void): void;
}

// ---------------------------------------------------------------------------
// sdk.workflows
// ---------------------------------------------------------------------------

export interface Workflow {
  id: string;
  name: string;
  kind: string;
  enabled: boolean;
  created_at: number;
  updated_at: number;
}

export interface ListWorkflowsOptions {
  limit?: number;
  offset?: number;
}

export interface SdkWorkflows {
  /** List workflows. */
  list(opts?: ListWorkflowsOptions): Promise<{ workflows: Workflow[]; total: number }>;
  /** Get a single workflow by ID. */
  get(id: string): Promise<Workflow | undefined>;
}

// ---------------------------------------------------------------------------
// sdk.matchReplace
// ---------------------------------------------------------------------------

export type MatchReplacePhase = 'request' | 'response';
export type MatchReplaceSection = 'RequestLine' | 'RequestHeader' | 'RequestBody' | 'ResponseLine' | 'ResponseHeader' | 'ResponseBody';
export type MatchReplaceOperation = string;

export interface MatchReplaceRule {
  id: string;
  name: string;
  phase: MatchReplacePhase;
  match_host?: string;
  match_path?: string;
  match_method?: string;
  match_status?: string;
  enabled: boolean;
  created_at: number;
}

export interface CreateMatchReplaceRuleBody {
  name: string;
  phase: MatchReplacePhase;
  match_host?: string;
  match_path?: string;
  match_method?: string;
  match_status?: string;
  enabled?: boolean;
}

export interface SdkMatchReplace {
  /** Get all match-and-replace rules. */
  getRules(): Promise<MatchReplaceRule[]>;
  /** Get a single rule by ID. */
  getRule(id: string): Promise<MatchReplaceRule | undefined>;
  /** Create a new rule. */
  createRule(rule: CreateMatchReplaceRuleBody): Promise<MatchReplaceRule>;
  /** Update an existing rule. */
  updateRule(id: string, patch: Partial<CreateMatchReplaceRuleBody>): Promise<MatchReplaceRule>;
  /** Delete a rule. */
  deleteRule(id: string): Promise<void>;
  /** Enable or disable a rule. */
  toggleRule(id: string, enabled: boolean): Promise<MatchReplaceRule>;
  /** Register a callback fired when any rule changes. */
  onCurrentRuleChange(callback: () => void): void;
}

// ---------------------------------------------------------------------------
// sdk.fs  (scoped to the plugin's data directory)
// ---------------------------------------------------------------------------

export interface SdkFs {
  /** Read a file from the plugin data directory. Returns the file content as a string. */
  read(path: string): string;
  readFile(path: string): string;
  readFileSync(path: string): string;
  /** Write a string to a file in the plugin data directory. Creates the file if it doesn't exist. */
  write(path: string, data: string): void;
  writeFile(path: string, data: string): void;
  writeFileSync(path: string, data: string): void;
  appendFile(path: string, data: string): void;
  /** List files and directories in the given path within the plugin data directory. */
  list(dir?: string): string[];
  /** Create a directory (and parents) in the plugin data directory. */
  mkdir(path: string): void;
  exists(path: string): boolean;
  existsSync(path: string): boolean;
}

export interface SdkPath {
  join(...parts: string[]): string;
  dirname(path: string): string;
  basename(path: string): string;
  extname(path: string): string;
}

// ---------------------------------------------------------------------------
// OgmaBackendSdk  (the full sdk object passed to init())
// ---------------------------------------------------------------------------

export interface OgmaBackendSdk {
  console: SdkConsole;
  /** Alias for sdk.console. */
  log: SdkLog;
  events: SdkEvents;
  requests: SdkRequests;
  findings: SdkFindings;
  storage: SdkStorage;
  api: SdkApi;
  env: SdkEnv;
  /** Alias for sdk.env. */
  environment: SdkEnv;
  scope: SdkScope;
  projects: SdkProjects;
  replay: SdkReplay;
  meta: SdkMeta;
  settings: SdkSettings;
  workflows: SdkWorkflows;
  matchReplace: SdkMatchReplace;
  fs: SdkFs;
  path: SdkPath;
}

// ---------------------------------------------------------------------------
// Frontend SDK
// ---------------------------------------------------------------------------

export interface FrontendRequestEntry {
  id: string;
  method: string;
  host: string;
  port: number;
  path: string;
  query: string;
  req_len: number;
  resp_status: number | null;
  resp_len: number | null;
  roundtrip_ms: number | null;
  created_at: number;
}

export interface FrontendRawBodies {
  requestBodyBase64: string;
  responseBodyBase64: string;
  requestBodyLength: number;
  responseBodyLength: number;
  requestBodyTruncated: boolean;
  responseBodyTruncated: boolean;
  maxBodyBytes: number;
}

export interface FrontendFinding {
  id: string;
  title: string;
  severity: FindingSeverity;
  status: string;
  reporter: string;
  tags: string[];
  created_at: number;
}

export interface OgmaFrontendSdk {
  meta: {
    get(): Promise<{ pluginId: string; packageId: string; name: string; version: string; ogmaVersion: string }>;
  };
  log: SdkLog;
  requests: {
    get(id: string): Promise<FrontendRequestEntry>;
    getRaw(id: string): Promise<FrontendRawBodies>;
    search(opts?: { query?: string; limit?: number; offset?: number }): Promise<{
      items: FrontendRequestEntry[];
      total: number;
      limit: number;
      offset: number;
    }>;
  };
  findings: {
    list(opts?: { limit?: number; offset?: number }): Promise<{ items: FrontendFinding[]; total: number; limit: number; offset: number }>;
  };
  scope: { getActive(): Promise<(ScopePreset & { rules: Array<{ pattern: string; include: boolean }> }) | null> };
  projects: { getCurrent(): Promise<(OgmaProject & { status: string }) | null> };
  navigation: { addPage(path: string, opts?: { title?: string; body?: HTMLElement }): Promise<{ registered: boolean }> };
  sidebar: { registerItem(name: string, path: string): Promise<{ registered: boolean }> };
  ui: {
    resize(height: number): Promise<{ height: number }>;
    sidebar: { registerItem(name: string, path: string): Promise<{ registered: boolean }> };
  };
  window: { showToast(message: string, opts?: { variant?: string; duration?: number }): Promise<void> };
  backend: {
    call(method: string, ...args: unknown[]): Promise<unknown>;
    onEvent(callback: (event: { event: string; args: unknown[] }) => void): void;
  };
  theme: SdkTheme;
}

export interface OgmaFrontendBootstrap extends OgmaFrontendSdk {
  ready(): Promise<OgmaFrontendSdk>;
  ready(callback: (sdk: OgmaFrontendSdk) => void): Promise<OgmaFrontendSdk>;
}

export type PluginPermission =
  | 'read_http_history' | 'read_ws_history' | 'read_findings' | 'read_replay'
  | 'read_workflows' | 'read_exports' | 'read_env' | 'read_scope'
  | 'read_projects' | 'read_match_replace' | 'plugin_storage' | 'ui_extension'
  | 'write_findings' | 'write_match_replace' | 'send_requests' | 'run_workflows' | 'create_exports'
  | 'read_secret_env' | 'network_access' | 'filesystem_access' | 'process_spawn' | 'admin';

export interface PluginManifest {
  id: string;
  name?: string;
  version: string;
  description?: string;
  permissions?: PluginPermission[];
  compatibility?: {
    ogma_min_version?: string;
    ogma_max_version?: string;
    sdk_version?: string;
  };
  signature?: {
    algorithm: 'ed25519';
    public_key: string;
    value: string;
  };
  plugins: Array<{
    kind: 'backend' | 'frontend' | 'workflow';
    id: string;
    entrypoint?: string;
    definition?: string;
    style?: string;
    runtime?: 'javascript';
  }>;
}

declare global {
  interface Window {
    ogmaSDK: OgmaFrontendBootstrap;
  }
}
