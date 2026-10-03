import type { OgmaBackendSdk, OgmaFrontendSdk, MutableRequestSpec, MutableRawRequestSpec, SearchResult, FrontendRequestEntry, FrontendFinding, ActiveScopePreset } from '../index';
import { Body } from '../index';

// The types-only package does not export a runtime Body constructor.
// @ts-expect-error Body is provided by the application runtime, not this package.
new Body();

declare const backend: OgmaBackendSdk;
declare const frontend: OgmaFrontendSdk;
declare const rawRequest: MutableRawRequestSpec;

backend.api.register('sum', (first: number, second: number): number => first + second);
backend.api.register('rename', async (id: string, options: { name: string }) => ({ id, name: options.name }));
backend.api.register('ping', () => 'pong');
// @ts-expect-error Backend API handlers must be functions.
backend.api.register('invalid', 42);

const hostVersion: string = backend.runtime.version();
void hostVersion;

const resolvedPath: string = backend.path.resolve('exports', 'app.js');
const absolutePath: boolean = backend.path.isAbsolute(resolvedPath);
const pathSeparator: string = backend.path.sep;
const stem: string = backend.path.basename(resolvedPath, '.js');
// @ts-expect-error A basename suffix must be a string.
backend.path.basename(resolvedPath, 1);
// @ts-expect-error Path resolution accepts string segments.
backend.path.resolve('exports', 1);
void [resolvedPath, absolutePath, pathSeparator, stem];

rawRequest.setRaw(new Uint8Array([0, 128, 255]));
const rawResponse = backend.requests.send(rawRequest);
const rawResponseStatus: number = rawResponse.resp_status;
void rawResponseStatus;
backend.requests.send({
  method: 'POST', host: 'example.test', port: 443, tls: true, path: '/', raw_b64: 'AID/',
});
// @ts-expect-error Raw body encoding must be a base64 string, not a byte array.
backend.requests.send({ method: 'POST', host: 'example.test', port: 443, tls: true, path: '/', raw_b64: new Uint8Array() });

backend.events.onUpstream((request) => {
  const raw: Uint8Array = request.getRaw();
  const spec: MutableRequestSpec = request.toSpec();
  spec.setHeader('Authorization', 'Bearer replacement');
  // @ts-expect-error Upstream callbacks receive a runtime object, not plain outbound fields.
  request.method = 'POST';
  void raw;
  return spec;
});
backend.events.onUpstream(async (request) => {
  await Promise.resolve();
  return request.toSpec().setMethod('POST');
});

const entry = backend.requests.get('entry-id');
if (entry) {
  const tls: boolean = entry.request.getTls();
  const created: Date | null = entry.request.getCreatedAt();
  const spec: MutableRequestSpec = entry.request.toSpec();
  spec.setMethod('POST').setHeader('X-Test', ['one', 'two']).setBody('body');
  const response = backend.requests.send(spec);
  const status: number = response.resp_status;
  const text: string = response.resp_body.text;
  void [tls, created, status, text];
}

const results = backend.requests.search({ limit: 10, offset: 0 });
backend.requests.send({
  method: 'GET', host: 'example.test', port: 443, tls: true, path: '/',
  headers: { Accept: 'application/json' },
});
const host: string | undefined = results.items[0]?.host;
const total: number = results.total;
const value: string | null = backend.storage.get('key');
const keys: string[] = backend.storage.keys();
const environmentValue: string | null = backend.env.getVar('EXPORT_FOLDER');
const environmentAlias: string | null = backend.env.get('EXPORT_FOLDER');
// @ts-expect-error Missing environment variables return null, not undefined.
const optionalEnvironment: string | undefined = backend.env.getVar('MISSING');
void [environmentValue, environmentAlias, optionalEnvironment];
backend.storage.set('key', 'value');
backend.storage.delete('key');
backend.storage.clear();
// Awaiting synchronous backend APIs remains valid for existing async plugins.
async function existingPlugin() {
  const fetched = await backend.requests.get('entry-id');
  return fetched?.request.getHost();
}
// Frontend bridge calls remain asynchronous.
const lookup: Promise<unknown> = frontend.requests.get('entry-id');
void [host, total, value, keys, existingPlugin, lookup];

const created: { created: boolean; id: string } = backend.findings.create({
  title: 'Unexpected access', severity: 'high', description: 'Observed in test traffic',
});
const finding = backend.findings.get(created.id);
const description: string | null | undefined = finding?.description;
const findingTotal: number = backend.findings.list().total;
backend.findings.create({ title: 'Default severity' });
if (entry) backend.findings.create({ title: 'Linked finding', request: entry.request, dedupeKey: 'linked', tags: ['plugin'] });
backend.findings.update(created.id, { status: 'confirmed', description: null, tags: ['reviewed'] });
// @ts-expect-error Creation-only evidence fields are not updatable.
backend.findings.update(created.id, { entry_id: 'different-entry' });
const filteredFindingTotal: number = backend.findings.list({ severity: 'high', reporter: 'plugin:' }).total;
const updated: { updated: true; id: string } = backend.findings.update(created.id, { title: 'Updated' });
const exists: boolean = backend.findings.exists('test-key');
const inScope: boolean = backend.scope.inScope('https://example.test');
const activeScope = backend.scope.getActive();
const pathPattern: string | null | undefined = activeScope?.rules[0]?.path_pattern;
const scopeExpression: string | null | undefined = activeScope?.httpql_expression;
const scopeRate: number | null | undefined = activeScope?.rate_limit_rps;
async function frontendScopeMetadata() {
  const scope = await frontend.scope.getActive();
  const ruleType: string | undefined = scope?.rules[0]?.rule_type;
  return ruleType;
}
void [pathPattern, scopeExpression, scopeRate, frontendScopeMetadata];
const legacyScope: ActiveScopePreset = {
  id: 'scope', name: 'Legacy', rules: [{ pattern: 'example.test', include: true }],
};
void legacyScope;
const projectName: string | undefined = backend.projects.getCurrent()?.name;
const projectList = backend.projects.list();
const projectStatus: string | undefined = projectList.items[0]?.status;
const projectCreatedAt: number | undefined = projectList.items[0]?.created_at;
const sessions = backend.replay.getSessions({ limit: 5 });
const attempts = backend.replay.getSession(sessions.items[0]?.id ?? '')?.attempts;
const workflows = backend.workflows.list();
const setting = backend.settings.get('apiKey');
const settingValue: string | null = setting;
if (setting !== null) {
  // @ts-expect-error Backend settings are synchronous, not promises.
  setting.then(() => {});
}
async function awaitedSettings() {
  const value: string | null = await backend.settings.get('apiKey');
  return value;
}
void [settingValue, awaitedSettings];
const workflowType: string | undefined = workflows.items[0]?.workflow_type;
const definition: string | undefined = backend.workflows.get('workflow-id')?.definition_json;
void [description, findingTotal, filteredFindingTotal, updated, exists, inScope, projectName, projectStatus, projectCreatedAt, attempts, workflowType, definition];

const rule = backend.matchReplace.createRule({
  name: 'Beautify response', isEnabled: false, query: 'req.path.cont:".js"',
  section: { kind: 'SectionResponseBody', operation: {
    kind: 'OperationBodyRaw', matcher: { kind: 'MatcherRawFull' },
    replacer: { kind: 'ReplacerWorkflow', workflowId: 'convert-workflow' },
  } },
});
const renamed = backend.matchReplace.updateRule(rule.id, { name: 'Renamed' });
const query: string = renamed.query;
const enabled: boolean = backend.matchReplace.getRules()[0]!.isEnabled;
const maybeRule = backend.matchReplace.getRule(rule.id);
backend.matchReplace.toggleRule(rule.id, true);
backend.matchReplace.deleteRule(rule.id);
void [query, enabled, maybeRule];

const missingQuery: SearchResult['query'] = null;
const missingFrontendQuery: FrontendRequestEntry['query'] = null;
const missingReporter: FrontendFinding['reporter'] = null;
void [missingQuery, missingFrontendQuery, missingReporter];
