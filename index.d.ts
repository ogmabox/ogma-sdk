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
export interface Body {
  /** The body length in bytes. */
  readonly length: number;
  /** Returns the full body text. */
  toText(): string;
  /** Parses the body as JSON. Returns null if not valid JSON. */
  toJson(): unknown;
  /** Returns raw bytes as a Uint8Array. */
  toRaw(): Uint8Array;
}

export interface HttpRequest {
  getId(): string | null;
  getHost(): string;
  getPort(): number;
  getTls(): boolean;
  getMethod(): string;
  getPath(): string;
  getQuery(): string;
  getUrl(): string;
  getHeaders(): Record<string, string>;
  getHeader(name: string): string | undefined;
  getBody(): Body | undefined;
  getCreatedAt(): Date | null;
  /** Create an editable copy of the request's URL, method, headers, and body text. */
  toSpec(): MutableRequestSpec;
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
  headers?: Array<[string, string]> | Record<string, string>;
  body?: string;
  /** Base64-encoded body bytes. Takes precedence over body when provided. */
  raw_b64?: string;
}

/** Runtime RequestSpec objects use methods rather than plain outbound fields. */
export interface MutableRequestSpec {
  getMethod(): string;
  setMethod(method: string): this;
  getHost(): string;
  setHost(host: string): this;
  getPort(): number;
  setPort(port: number): this;
  getTls(): boolean;
  setTls(tls: boolean): this;
  getPath(): string;
  setPath(path: string): this;
  getQuery(): string;
  setQuery(query: string): this;
  setHeader(name: string, value: string | string[]): this;
  removeHeader(name: string): this;
  getBody(): string | Body | null;
  setBody(body: string | Body | null): this;
}

/** Runtime RequestSpecRaw passed to upstream callbacks. Use toSpec() to edit headers or body. */
export interface MutableRawRequestSpec extends Omit<MutableRequestSpec, 'setHeader' | 'removeHeader' | 'getBody' | 'setBody'> {
  setRaw(bytes: Uint8Array): this;
  getRaw(): Uint8Array;
  getInfo(): { host: string; port: number; tls: boolean };
  toSpec(): MutableRequestSpec;
  getSpec(): MutableRequestSpec;
}

export type UpstreamRequestResult = RequestSpec | MutableRequestSpec | MutableRawRequestSpec | void;

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
  onUpstream(callback: (req: MutableRawRequestSpec) => UpstreamRequestResult | Promise<UpstreamRequestResult>): void;
  /** Called when a new finding is created. */
  onFindingCreated(callback: (finding: Finding) => void): void;
}

// ---------------------------------------------------------------------------
// sdk.requests
// ---------------------------------------------------------------------------

export interface SearchOptions {
  /** HTTPQL query string, e.g. 'req.host.eq:"example.com" AND req.method.eq:"POST"'. */
  q?: string;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  id: string;
  method: string;
  host: string;
  port: number;
  path: string;
  query: string | null;
  resp_status: number | null;
  resp_len: number | null;
  roundtrip_ms: number | null;
  created_at: number;
}

export interface BackendResponseEntry {
  id: null;
  resp_status: number;
  resp_headers: Record<string, string>;
  resp_body: { text: string; size: number; truncated: boolean };
  roundtrip_ms: number;
}

export interface SdkRequests {
  /** Fetch a single HTTP entry by id. Returns undefined if not found. */
  get(id: string): { request: HttpRequest; response?: HttpResponse } | undefined;
  /** Search the active project's HTTP history. Returns matching entry metadata. */
  search(opts?: SearchOptions): { items: SearchResult[]; total: number; limit: number; offset: number };
  /** Send an HTTP request and return the response. */
  send(spec: RequestSpec | MutableRequestSpec | MutableRawRequestSpec): BackendResponseEntry;
}

// ---------------------------------------------------------------------------
// sdk.findings
// ---------------------------------------------------------------------------

export type FindingSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface CreateFindingSpec {
  title: string;
  /** Defaults to info. */
  severity?: FindingSeverity;
  description?: string;
  tags?: string[];
  /** Prevents duplicate findings. If a finding with this key exists, returns it. */
  dedupe_key?: string;
  /** Compatible alias for dedupe_key. */
  dedupeKey?: string;
  /** Links the finding to an HTTP history entry. */
  entry_id?: string;
  /** Links the finding to this request when entry_id is not supplied. */
  request?: HttpRequest;
}

export interface UpdateFindingSpec {
  title?: string;
  severity?: FindingSeverity;
  status?: 'open' | 'confirmed' | 'false_positive' | 'resolved';
  /** Use null to clear the description. */
  description?: string | null;
  tags?: string[];
}

export interface Finding {
  id: string;
  title: string;
  severity: FindingSeverity;
  description: string | null;
  dedupe_key: string | null;
  entry_id: string | null;
  status: string;
  reporter: string | null;
  tags: string[];
  created_at: number;
  updated_at: number;
}

export interface ListFindingsOptions {
  limit?: number;
  offset?: number;
  severity?: FindingSeverity;
  /** Case-insensitive substring match against the finding reporter. */
  reporter?: string;
}

export interface SdkFindings {
  create(spec: CreateFindingSpec): { created: boolean; id: string };
  get(id: string): Finding | null;
  list(opts?: ListFindingsOptions): {
    items: Omit<Finding, 'description' | 'dedupe_key'>[];
    total: number;
    limit: number;
    offset: number;
  };
  update(id: string, patch: UpdateFindingSpec): { updated: true; id: string };
  /** Check whether a finding with the given dedupe_key already exists. */
  exists(dedupeKeyOrSpec: string | { dedupeKey: string }): boolean;
}

// ---------------------------------------------------------------------------
// sdk.storage
// ---------------------------------------------------------------------------

export interface SdkStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  delete(key: string): void;
  keys(): string[];
  clear(): void;
}

// ---------------------------------------------------------------------------
// sdk.api  (backend <-> frontend bridge)
// ---------------------------------------------------------------------------

export interface SdkApi {
  /** Register a function callable from the frontend via sdk.backend.call(name, ...args). */
  register<Args extends unknown[], Result>(name: string, fn: (...args: Args) => Result | Promise<Result>): void;
  /** Send an event to the frontend. Received via sdk.backend.onEvent(). */
  send(event: string, ...args: unknown[]): void;
}

// ---------------------------------------------------------------------------
// sdk.env  (environment variables defined in Ogma Settings > Environment)
// ---------------------------------------------------------------------------

export interface SdkEnv {
  /**
   * Reads the latest saved non-secret value, with active-project variables overriding globals.
   * Returns null when the variable is missing or unavailable to this plugin.
   */
  getVar(name: string): string | null;
  /** Alias for getVar. */
  get(name: string): string | null;
}

// ---------------------------------------------------------------------------
// sdk.scope
// ---------------------------------------------------------------------------

export interface ScopePreset {
  id: string;
  name: string;
}

export interface ScopeRule {
  pattern: string;
  include: boolean;
  /** Absent on older app versions. */
  rule_type?: string;
  path_pattern?: string | null;
}

export interface ActiveScopePreset extends ScopePreset {
  rules: ScopeRule[];
  /** Additional metadata is absent on older app versions. */
  httpql_expression?: string | null;
  rate_limit_rps?: number | null;
  created_at?: number;
}

export interface SdkScope {
  getActive(): ActiveScopePreset | null;
  /** Check a URL (host, path, port, TLS) or a bare hostname against the active scope. */
  inScope(url: string): boolean;
}

// ---------------------------------------------------------------------------
// sdk.projects
// ---------------------------------------------------------------------------

export interface OgmaProject {
  id: string;
  name: string;
}

export interface SdkProjects {
  getCurrent(): (OgmaProject & { status: string; created_at: number }) | null;
  /** List up to 50 projects in the current workspace. */
  list(): { items: Array<OgmaProject & { status: string; created_at: number }> };
}

// ---------------------------------------------------------------------------
// sdk.replay
// ---------------------------------------------------------------------------

export interface ReplaySession {
  id: string;
  name: string;
  from_entry_id: string | null;
  created_at: number;
}

export interface SdkReplay {
  getSessions(opts?: { limit?: number; offset?: number }): {
    items: ReplaySession[]; total: number; limit: number; offset: number;
  };
  getSession(id: string): (ReplaySession & {
    attempt_count: number;
    attempts: Array<{ id: string; session_id: string; entry_id: string | null; seq: number; created_at: number }>;
  }) | null;
}

// ---------------------------------------------------------------------------
// sdk.runtime
// ---------------------------------------------------------------------------

export interface SdkRuntime {
  /** Returns the version of the Ogma application hosting this plugin. */
  version(): string;
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
  /** Synchronously get the saved settings value. Returns null if not set. */
  get(key: string): string | null;
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
  workflow_type: string;
  description: string | null;
  enabled: boolean;
  logging_enabled: boolean;
  created_at: number;
  updated_at: number;
}

export interface ListWorkflowsOptions {
  limit?: number;
  offset?: number;
}

export interface SdkWorkflows {
  /** List active-project and workspace-shared workflows, with pagination. */
  list(opts?: ListWorkflowsOptions): { items: Workflow[]; total: number; limit: number; offset: number };
  /** Get a single workflow by ID. */
  get(id: string): (Workflow & { definition_json: string }) | null;
}

// ---------------------------------------------------------------------------
// sdk.matchReplace
// ---------------------------------------------------------------------------

export type MatchReplacePhase = 'request' | 'response';
export type MatchReplaceSection =
  | 'SectionRequestFirstLine' | 'SectionRequestHeader' | 'SectionRequestBody'
  | 'SectionRequestPath' | 'SectionRequestQuery'
  | 'SectionResponseFirstLine' | 'SectionResponseHeader' | 'SectionResponseBody'
  | 'SectionResponseStatusCode';
export type MatchReplaceOperation =
  | 'OperationFirstLineRaw' | 'OperationHeaderRaw' | 'OperationHeaderAdd'
  | 'OperationHeaderRemove' | 'OperationHeaderUpdate' | 'OperationBodyRaw'
  | 'OperationPathRaw' | 'OperationQueryRaw' | 'OperationQueryAdd'
  | 'OperationQueryRemove' | 'OperationQueryUpdate' | 'OperationStatusCodeUpdate';

export interface MatchReplaceSectionSpec {
  kind: MatchReplaceSection;
  operation: {
    kind: MatchReplaceOperation;
    matcher?:
      | { kind: 'MatcherRawFull' }
      | { kind: 'MatcherRawValue'; value: string }
      | { kind: 'MatcherRawRegex'; regex: string }
      | { kind: 'MatcherName'; name: string };
    replacer?:
      | { kind: 'ReplacerTerm'; term: string }
      | { kind: 'ReplacerWorkflow'; workflowId: string };
  };
}

export interface MatchReplaceRule {
  id: string;
  name: string;
  isEnabled: boolean;
  /** HTTPQL filter, or an empty string when no query is configured. */
  query: string;
  section: MatchReplaceSectionSpec;
  collectionId: string;
  sources: string[];
}

export interface CreateMatchReplaceRuleBody {
  name: string;
  section: MatchReplaceSectionSpec;
  isEnabled?: boolean;
  /** Legacy alias for isEnabled. */
  enabled?: boolean;
  query?: string;
  filter_host?: string | null;
  filter_method?: string | null;
  position?: number;
}

export interface SdkMatchReplace {
  /** Get all match-and-replace rules. */
  getRules(): MatchReplaceRule[];
  /** Get a single rule by ID. */
  getRule(id: string): MatchReplaceRule | null;
  /** Create a new rule. */
  createRule(rule: CreateMatchReplaceRuleBody): MatchReplaceRule;
  /** Update an existing rule. */
  updateRule(id: string, patch: Partial<CreateMatchReplaceRuleBody>): MatchReplaceRule;
  /** Delete a rule. */
  deleteRule(id: string): void;
  /** Enable or disable a rule. */
  toggleRule(id: string, enabled: boolean): void;
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
  basename(path: string, suffix?: string): string;
  extname(path: string): string;
  /** Resolve segments against the backend process's working directory. */
  resolve(...parts: string[]): string;
  isAbsolute(path: string): boolean;
  /** The backend platform's directory separator. */
  readonly sep: string;
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
  runtime: SdkRuntime;
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
  query: string | null;
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
  reporter: string | null;
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
  scope: { getActive(): Promise<ActiveScopePreset | null> };
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
