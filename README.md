<p align="center">
  <a href="https://github.com/ogmabox/ogma-sdk">
    <img src=".github/banner.png" alt="Ogma SDK" width="100%">
  </a>
</p>

<div align="center">

# @kaijinlab/ogma-sdk

### TypeScript type definitions for the Ogma plugin SDK.

<br/>

[![npm](https://img.shields.io/npm/v/@kaijinlab/ogma-sdk?style=for-the-badge&color=e8a44a)](https://www.npmjs.com/package/@kaijinlab/ogma-sdk)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-e8a44a?style=for-the-badge)](LICENSE)
[![Types](https://img.shields.io/badge/types-included-555555?style=for-the-badge)](index.d.ts)

<br/>

<a href="https://discord.gg/QNSadmjh6y"><img src="https://img.shields.io/badge/Discord-Join%20Community-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord"></a>
<a href="https://x.com/kaijinlab"><img src="https://img.shields.io/badge/Follow-%40kaijinlab-000000?style=for-the-badge&logo=x&logoColor=white" alt="X / Twitter"></a>

</div>

---

This package provides TypeScript type definitions for the [Ogma](https://ogma.kaijinlab.com) plugin SDK. It has no runtime code -- types only.

## Install

```bash
npm install --save-dev @kaijinlab/ogma-sdk
```

## Quick start

```typescript
import type { OgmaBackendSdk, HttpRequest, HttpResponse } from '@kaijinlab/ogma-sdk';

async function init(sdk: OgmaBackendSdk): Promise<void> {
  sdk.console.log('Plugin started');

  sdk.events.onInterceptResponse(function (req: HttpRequest, resp?: HttpResponse): void {
    if (!resp) return;

    const host = req.getHost();
    const status = resp.getCode();
    const ct = resp.getHeader('content-type') ?? '';

    sdk.console.log(`${status} ${host} -- ${ct}`);
  });
}

// Expose init to the Ogma runtime
(globalThis as unknown as Record<string, unknown>).init = init;
```

Build with [esbuild](https://esbuild.github.io/):

```bash
npx esbuild src/backend.ts --bundle --format=iife --platform=neutral \
  --external:@kaijinlab/ogma-sdk --outfile=dist/backend.js
```

The `--external:@kaijinlab/ogma-sdk` flag tells esbuild not to bundle this package. The SDK is types-only -- the actual implementation is provided by the Ogma runtime.

---

## SDK reference

### `sdk.console`

```typescript
sdk.console.log(message: string): void
sdk.console.warn(message: string): void
sdk.console.error(message: string): void
```

Logs appear in **Settings > Plugins > [your plugin] > Logs**.

---

### `sdk.events`

```typescript
sdk.events.onInterceptRequest(callback: (req: HttpRequest) => void | Promise<void>): void
sdk.events.onInterceptResponse(callback: (req: HttpRequest, resp?: HttpResponse) => void): void
sdk.events.onProjectChange(callback: () => void): void
sdk.events.onCurrentRuleChange(callback: () => void): void
sdk.events.onUpstream(callback: (req: RequestSpec) => RequestSpec | void): void
```

---

### `sdk.requests`

```typescript
// Fetch a single history entry
sdk.requests.get(id: string): { request: HttpRequest; response?: HttpResponse } | undefined

// Search HTTP history with HTTPQL
sdk.requests.search(opts?: { q?: string; limit?: number; offset?: number }): { items: SearchResult[]; total: number; limit: number; offset: number }

// Send an outbound HTTP request
sdk.requests.send(spec: RequestSpec | MutableRequestSpec): BackendResponseEntry
```

Requires the `send_requests` permission to call `sdk.requests.send()`.

Backend request APIs return synchronously; existing code can still `await` their results. Search items are entry metadata, not request/response wrappers. Sending returns `resp_status`, `resp_headers`, `resp_body` (`text`, `size`, `truncated`), and `roundtrip_ms`. Use `request.toSpec()` to create a mutable copy with its headers and body text.

Searches use the active project, just like HTTP History. Without an active project, they return only unassigned entries. `requests.get(id)` remains an explicit entry lookup.

---

### `sdk.findings`

```typescript
sdk.findings.create(spec: CreateFindingSpec): { created: boolean; id: string }
sdk.findings.get(id: string): Finding | null
sdk.findings.list(opts?: ListFindingsOptions): { items: Omit<Finding, 'description' | 'dedupe_key'>[]; total: number; limit: number; offset: number }
sdk.findings.update(id: string, patch: UpdateFindingSpec): { updated: true; id: string }
sdk.findings.exists(key: string | { dedupeKey: string }): boolean
```

Requires the `write_findings` permission. Calls to `sdk.findings.create()` must be made inside an event callback (`onInterceptRequest` or `onInterceptResponse`).

Mutation results contain the finding ID and an outcome flag, not a full finding. Fetch the full record with `sdk.findings.get(result.id)` when needed. Read methods require `read_findings`; `write_findings` is needed for mutations.

`findings.list` reads the active project's findings. Options include `severity`, a case-insensitive `reporter` substring, `limit`, and `offset`. Filters apply before pagination; `total` is the number of matching findings, not just the current page.

```typescript
interface CreateFindingSpec {
  title: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  description: string;
  dedupe_key?: string; // prevents duplicate findings per host/check
  entry_id?: string;   // links the finding to an HTTP entry
}
```

---

### `sdk.storage`

Persistent key-value store scoped to your plugin. Survives restarts.

```typescript
sdk.storage.get(key: string): string | null
sdk.storage.set(key: string, value: string): void
sdk.storage.delete(key: string): void
sdk.storage.keys(): string[]
sdk.storage.clear(): void
```

---

### `sdk.api`

Bridge between your backend and frontend.

```typescript
// Register a function callable from the frontend
sdk.api.register(name: string, fn: (...args: unknown[]) => unknown | Promise<unknown>): void

// Send an event to the frontend
sdk.api.send(event: string, ...args: unknown[]): void
```

In the frontend, receive events with `sdk.backend.onEvent()` and call backend functions with `sdk.backend.call(name, ...args)`.

---

### `sdk.env`

Read environment variables defined in **Settings > Environment**.

```typescript
sdk.env.getVar(name: string): string | undefined
```

Requires the `read_env` permission.

---

### `sdk.scope`

```typescript
sdk.scope.getActive(): ActiveScopePreset | null
sdk.scope.inScope(url: string): boolean
```

`inScope()` accepts a full URL or a bare hostname. URLs supply the host, path,
port, and TLS state for scope rules and HTTPQL expressions. A hostname alone
provides no path, port, or TLS context. Neither input specifies an HTTP method.

`getActive()` includes rule types and path patterns, the HTTPQL expression,
rate limit, and creation timestamp. These additional fields are optional in the
SDK types for compatibility with older app versions. The frontend getter returns
the same metadata asynchronously.

---

### `sdk.projects`

```typescript
sdk.projects.getCurrent(): (OgmaProject & { status: string; created_at: number }) | null
sdk.projects.list(): { items: Array<OgmaProject & { status: string; created_at: number }> }
```

`list()` returns up to 50 projects in the current workspace.

---

### `sdk.workflows`

```typescript
sdk.workflows.list(opts?: { limit?: number; offset?: number }): {
  items: Workflow[]; total: number; limit: number; offset: number;
}
sdk.workflows.get(id: string): (Workflow & { definition_json: string }) | null
```

Backend reads are synchronous. `list()` returns the active project's workflows
and workspace-shared workflows, newest first. `total` counts matching workflows
before pagination. List items contain metadata; `get(id)` loads the definition
for an explicit ID and returns `null` if it no longer exists.
Without an active project, all workspace workflows are listed.

---

### `sdk.settings.get`

`sdk.settings.get(key)` returns the saved value synchronously as a string, or
`null` when unset. It reads plugin storage under `__settings__:<key>` and requires
`plugin_storage`. Existing `await sdk.settings.get(key)` calls still work, but
the result is not a Promise and does not have a `.then()` method.

---

### `sdk.matchReplace`

Backend Match & Replace methods are synchronous. Rules use a `section` containing an `operation`, matcher, and replacer. The enabled-state field returned by the runtime is `isEnabled`; `enabled` remains an accepted input alias. `query` is an HTTPQL filter.

```typescript
const rule = sdk.matchReplace.createRule({
  name: 'Beautify JavaScript responses',
  isEnabled: false,
  query: 'resp.headers["Content-Type"].value.cont:"javascript"',
  section: {
    kind: 'SectionResponseBody',
    operation: {
      kind: 'OperationBodyRaw',
      matcher: { kind: 'MatcherRawFull' },
      replacer: { kind: 'ReplacerWorkflow', workflowId: 'your-convert-workflow-id' },
    },
  },
});
sdk.matchReplace.updateRule(rule.id, { name: 'Renamed workflow rule' });
sdk.matchReplace.toggleRule(rule.id, true);
```

Partial updates preserve omitted fields. `getRules()` returns an array; `getRule(id)` returns a rule or `null`. `createRule()` and `updateRule()` return the resulting rule, while `toggleRule()` and `deleteRule()` have no result. Mutations require `write_match_replace`.

---

### `HttpRequest` methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getId()` | `string \| null` | History entry ID |
| `getHost()` | `string` | Hostname, e.g. `example.com` |
| `getPort()` | `number` | Port number |
| `getMethod()` | `string` | HTTP method |
| `getPath()` | `string` | URL path |
| `getQuery()` | `string` | Query string (without `?`) |
| `getUrl()` | `string` | Full URL |
| `getHeaders()` | `Record<string, string>` | All request headers |
| `getHeader(name)` | `string \| undefined` | Single header, case-insensitive |
| `getBody()` | `Body \| undefined` | Request body wrapper |
| `getTls()` | `boolean` | Whether the request uses TLS |
| `getCreatedAt()` | `Date \| null` | Capture time |
| `toSpec()` | `MutableRequestSpec` | Editable copy of the request |

### `HttpResponse` methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getId()` | `string \| null` | History entry ID |
| `getCode()` | `number` | HTTP status code |
| `getHeaders()` | `Record<string, string>` | All response headers |
| `getHeader(name)` | `string \| undefined` | Single header, case-insensitive |
| `getBody()` | `Body \| undefined` | Response body wrapper |
| `getRoundtripTime()` | `number` | Round-trip time in milliseconds |
| `getCreatedAt()` | `Date \| null` | Capture time |

---

## Plugin constraints

- **No `import` or `require`** in backend plugins. Bundle everything into a single file.
- **No `fetch` or `XMLHttpRequest`**. Use `sdk.requests.send()` for outbound requests.
- **No `localStorage`** in frontend plugins. Use `sdk.storage` for persistence.
- Backend script size limit: **256 KB**.
- Backend memory limit: **64 MB** per runtime.
- Initialization limit: **30 seconds**; callback limit: **8 seconds**.
- Event queues hold **50 events** and callback concurrency is capped at **4**.

Ogma stops event delivery after repeated callback failures. Plugin frontend code runs in a sandboxed iframe, and backend JavaScript runs in a restricted QuickJS context without direct process, network, or unrestricted filesystem access; approved SDK methods mediate those capabilities.

---

## Plugin permissions

Declare all permissions your plugin uses in `manifest.json`:

| Permission | Required for |
|------------|-------------|
| `write_findings` | `sdk.findings.create()`, `sdk.findings.update()` |
| `write_match_replace` | Mutating `sdk.matchReplace` methods |
| `read_http_history` | `sdk.requests.search()`, `sdk.requests.get()` |
| `send_requests` | `sdk.requests.send()` |
| `ui_extension` | Any frontend entry point |
| `read_env` | `sdk.env.getVar()` |
| `read_scope` | `sdk.scope.getActive()`, `sdk.scope.inScope()` |
| `read_projects` | `sdk.projects.getCurrent()` |

Declare safe permissions so frontend access can be granted and the installer can present an accurate review. Protected permissions are reviewed separately in Ogma before they are granted.

### Compatibility and signing

Declare the supported Ogma and SDK versions in `manifest.json`:

```json
{
  "compatibility": {
    "ogma_min_version": "0.1.0",
    "ogma_max_version": "0.1.99",
    "sdk_version": "1.0.0"
  }
}
```

Ogma rejects packages outside the declared Ogma range or with a different SDK major version. Packages may include an Ed25519 `signature` object containing `algorithm`, a base64 `public_key`, and a base64 signature `value`; signed registry entries bind that key to the publisher metadata.

Sign a package after building it:

```bash
openssl genpkey -algorithm ED25519 -out publisher-key.pem
npx ogma-plugin-sign ./dist --key ./publisher-key.pem
```

Keep the private key outside the package and source repository. Re-run the signer whenever any packaged file or manifest field changes.

### Frontend SDK

Frontend entry points use `window.ogmaSDK`. Calls made before the host bridge is ready are queued, or initialization can be explicit:

```typescript
window.ogmaSDK.ready(async (sdk) => {
  const current = await sdk.projects.getCurrent();
  const history = await sdk.requests.search({ query: 'req.host.cont:"example.com"' });
  sdk.log.info(`${current?.name ?? 'No project'}: ${history.total} requests`);
});
```

The frontend contract includes request metadata and raw body access, findings, active scope, current project, plugin-local navigation/sidebar pages, theme updates, toasts, resizing, and backend calls. Import `OgmaFrontendSdk`, `OgmaFrontendBootstrap`, or `PluginManifest` for the corresponding types.

---

## Plugin examples

- [Request Counter](https://github.com/ogmabox/awesome-ogma-plugins/tree/master/plugins/request-counter) -- minimal plain JavaScript plugin
- [Security Headers Checker](https://github.com/ogmabox/awesome-ogma-plugins/tree/master/plugins/security-headers) -- TypeScript + esbuild

Browse the full registry: [awesome-ogma-plugins](https://github.com/ogmabox/awesome-ogma-plugins)

---

## Contributing

Type corrections and additions are welcome. Open an issue or a pull request.

Before submitting, verify the types compile:

```bash
npx tsc --noEmit --strict --moduleResolution node index.d.ts
```

---

## License

[AGPL-3.0-only](LICENSE)
