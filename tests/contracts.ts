import type { OgmaBackendSdk, OgmaFrontendSdk, MutableRequestSpec, SearchResult, FrontendRequestEntry, FrontendFinding } from '../index';

declare const backend: OgmaBackendSdk;
declare const frontend: OgmaFrontendSdk;

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
const updated: { updated: true; id: string } = backend.findings.update(created.id, { title: 'Updated' });
const exists: boolean = backend.findings.exists('test-key');
const inScope: boolean = backend.scope.inScope('https://example.test');
const projectName: string | undefined = backend.projects.getCurrent()?.name;
const sessions = backend.replay.getSessions({ limit: 5 });
const attempts = backend.replay.getSession(sessions.items[0]?.id ?? '')?.attempts;
const workflows = backend.workflows.list();
const workflowType: string | undefined = workflows.items[0]?.workflow_type;
const definition: string | undefined = backend.workflows.get('workflow-id')?.definition_json;
void [description, findingTotal, updated, exists, inScope, projectName, attempts, workflowType, definition];

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
