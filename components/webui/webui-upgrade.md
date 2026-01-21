# WebUI Dependency Upgrade - Breaking Changes Analysis

This document outlines the breaking changes and required code modifications for the major version upgrades in the webui component.

## Summary of Major Version Upgrades

| Package | Old Version | New Version | Breaking Changes |
|---------|-------------|-------------|------------------|
| antd | ^5.27.5 | ^6.2.1 | **Yes - Code changes required** |
| @sinclair/typebox → typebox | ^0.34.27 | ^1.0.79 | **Yes - Code changes required** |
| @fastify/type-provider-typebox | ^5.2.0 | ^6.1.0 | **Yes - Requires TypeBox 1.x** |
| monaco-editor | ^0.52.2 | ^0.55.1 | **Yes - Import path changes** |
| react-syntax-highlighter | ^15.6.6 | ^16.1.0 | No code changes required |
| @fastify/static | ^8.2.0 | ^9.0.0 | No code changes required |
| @types/node | 22.x | 22.19.7 | No (kept at 22.x for LTS) |

---

## 1. antd v5 → v6 (REQUIRES CODE CHANGES)

### Required Changes

#### 1.1 Remove `@ant-design/v5-patch-for-react-19`

The `@ant-design/v5-patch-for-react-19` package was a temporary compatibility layer for using antd v5 with React 19. In antd v6, React 19 support is native and this patch must be removed.

**File:** `client/package.json`
```diff
  "dependencies": {
-   "@ant-design/v5-patch-for-react-19": "^1.0.3",
    "@emotion/react": "^11.14.0",
```

**File:** `client/src/App.tsx`
```diff
  import THEME_CONFIG from "./theme";

- import "@ant-design/v5-patch-for-react-19";


  /**
```

#### 1.2 Add `@ant-design/icons` as Explicit Dependency

The codebase uses `@ant-design/icons` (in 10 files) but it's not listed as an explicit dependency. With antd v6, you should explicitly add `@ant-design/icons` v6 to ensure version compatibility.

**File:** `client/package.json`
```diff
  "dependencies": {
+   "@ant-design/icons": "^6.1.0",
    "@emotion/react": "^11.14.0",
```

**Files using @ant-design/icons:**
- `client/src/components/Layout/MainLayout.tsx`
- `client/src/pages/IngestPage/Compress/PathsSelectFormItem/SwitcherIcon.tsx`
- `client/src/pages/SearchPage/SearchControls/Presto/SqlInterfaceSelector/index.tsx`
- `client/src/pages/SearchPage/SearchControls/Presto/SqlSearchButton/CancelButton/index.tsx`
- `client/src/pages/SearchPage/SearchControls/Presto/SqlSearchButton/RunButton/FreeformRunButton.tsx`
- `client/src/pages/SearchPage/SearchControls/Presto/SqlSearchButton/RunButton/GuidedRunButton.tsx`
- `client/src/pages/SearchPage/SearchControls/Native/SearchButton/SubmitButton/index.tsx`
- `client/src/pages/SearchPage/SearchControls/QueryStatus/OpenQueryDrawerButton.tsx`
- `client/src/pages/SearchPage/SearchResults/SearchResultsTable/Native/Message/LogViewerLink.tsx`
- `client/src/pages/SearchPage/SearchControls/Native/SearchButton/CancelButton.tsx`

#### 1.3 Update Theme Configuration cssVar

The `cssVar` option type changed in v6. Using `cssVar: true` no longer works; use `cssVar: {}` instead.

**File:** `client/src/theme.tsx`
```diff
  const THEME_CONFIG: ThemeConfig = Object.freeze({
      token: {
          fontFamily: "'Inter', sans-serif",
          colorPrimary: "#2a8efa",
          borderRadius: 3,
      },
-     cssVar: true,
+     cssVar: {},
      hashed: false,
  });
```

### No Changes Required (Already Compatible)

The codebase is already well-prepared for antd v6:

1. **Theme Configuration** (`client/src/theme.tsx`): Uses `cssVar: {}` and `hashed: false`, which aligns with v6's default CSS Variables mode.

2. **No Deprecated Components Used**: The codebase does not use any of the deprecated patterns:
   - No `Button.Group` (should use `Space.Compact`)
   - No `BackTop` (should use `FloatButton.BackTop`)
   - No `Breadcrumb.Item` or `Breadcrumb.Separator` (should use `items` prop)
   - No `Anchor` with `children` (should use `items` prop)

3. **React Version**: Already using React 19, which is fully supported in antd v6.

4. **Modern Browser Target**: No IE support needed, compatible with v6's CSS Variables requirement.

### Additional Notes

- antd v6 adjusts the DOM structure of many components for semantic structure. If you have custom CSS targeting internal component DOM nodes, verify they still work after upgrade.
- v6 enables blur effect on overlay layers by default. Can be disabled via `mask: { blur: false }` in ConfigProvider if needed.

---

## 2. react-syntax-highlighter v15 → v16 (NO CODE CHANGES REQUIRED)

### What Changed

The v16 release primarily updates the `refractor` dependency from v4 to v5, which addresses security vulnerabilities.

### Impact on Codebase

The codebase usage in `client/src/pages/SearchPage/SearchResults/SearchResultsTable/Native/Message/` is fully compatible:

```typescript
// Current usage - no changes needed
import SyntaxHighlighter from "react-syntax-highlighter";
import {tomorrow} from "react-syntax-highlighter/dist/esm/styles/hljs";
```

The API remains unchanged. The only consideration is ensuring dependency compatibility in `package-lock.json`, particularly if other packages depend on different versions of `refractor` or `prismjs`.

**Note:** The previous `prismjs` override in root `package.json` has been removed. react-syntax-highlighter v16 uses refractor v5, which already includes prismjs 1.30.0 (the secure version).

---

## 3. @fastify/static v8 → v9 (NO CODE CHANGES REQUIRED)

### What Changed

v9.0.0 primarily includes dependency updates:
- `glob` updated to v13
- `content-disposition` bumped from 0.5.4 to 1.0.1

### Impact on Codebase

The usage in `server/src/routes/static.ts` is fully compatible:

```typescript
// Current usage - no changes needed
import {fastifyStatic} from "@fastify/static";

await fastify.register(fastifyStatic, {
    prefix: "/streams",
    root: streamFilesDir,
    decorateReply: false,
});
```

The API (`register`, `prefix`, `root`, `decorateReply`, `wildcard` options) remains unchanged. No code modifications required.

---

## 4. @fastify/type-provider-typebox v5 → v6 (REQUIRES TYPEBOX 1.x)

### What Changed

**Critical:** v6.0.0 changed its peer dependency from `@sinclair/typebox` (0.26-0.34) to `typebox` (^1.0.13). This is a breaking change that requires migrating to TypeBox 1.x.

The TypeBox library was renamed from `@sinclair/typebox` to `typebox` in version 1.0.

### Impact on Codebase

All imports and usage of TypeBox must be updated. See **Section 4a: TypeBox 1.x Migration** below for complete migration details.

**Files using @fastify/type-provider-typebox:**
- `server/src/routes/api/archive-metadata/index.ts`
- `server/src/routes/api/compress-metadata/index.ts`
- `server/src/routes/api/compress/index.ts`
- `server/src/routes/api/example/index.ts`
- `server/src/routes/api/os/index.ts`
- `server/src/routes/api/presto-search/index.ts`
- `server/src/routes/api/search/index.ts`
- `server/src/routes/api/stream-files/index.ts`

---

## 4a. TypeBox 1.x Migration (@sinclair/typebox → typebox)

### Package Rename

TypeBox 1.0 renamed the package from `@sinclair/typebox` to `typebox`. All package.json files were updated:

```diff
  "dependencies": {
-   "@sinclair/typebox": "^0.34.27",
+   "typebox": "^1.0.79",
```

### Import Path Changes

All imports changed from `@sinclair/typebox` to `typebox`:

```diff
- import {Static, Type} from "@sinclair/typebox";
+ import {Static, Type} from "typebox";

- import {Value} from "@sinclair/typebox/value";
+ import {Value} from "typebox/value";
```

**Files updated (15 files total):**
- `client/src/pages/LogViewerLoadingPage/QueryStatus.tsx`
- `client/src/pages/IngestPage/Compress/validation.ts`
- `common/src/schemas/compression.ts`
- `common/src/schemas/native-search.ts`
- `common/src/schemas/os.ts`
- `common/src/schemas/presto-search.ts`
- `common/src/schemas/query-results.ts`
- `server/src/routes/api/archive-metadata/index.ts`
- `server/src/routes/api/compress-metadata/index.ts`
- `server/src/routes/api/compress/index.ts`
- `server/src/routes/api/example/index.ts`
- `server/src/routes/api/os/index.ts`
- `server/src/routes/api/presto-search/index.ts`
- `server/src/routes/api/search/index.ts`
- `server/src/routes/api/stream-files/index.ts`

### Error API Changes

The error handling API changed in TypeBox 1.x. Errors now use a `keyword` property instead of a `type` property with `ValueErrorType` enum:

**File:** `client/src/pages/IngestPage/Compress/validation.ts`
```diff
  import {Value} from "typebox/value";
- import {ValueErrorType} from "@sinclair/typebox/value";

  const validateDatasetName = (datasetName: string): string | null => {
      if (false === Value.Check(DatasetNameSchema, datasetName)) {
          const [firstError] = [...Value.Errors(DatasetNameSchema, datasetName)];

          if (firstError) {
-             if (ValueErrorType.StringMaxLength === firstError.type) {
+             if ("maxLength" === firstError.keyword) {
                  return "Dataset name can only be a maximum of " +
                      `${DATASET_NAME_MAX_LEN} characters long.`;
              }
-             if (ValueErrorType.StringPattern === firstError.type) {
+             if ("pattern" === firstError.keyword) {
                  return "Dataset name can only contain alphanumeric characters " +
                      "and underscores.";
              }
          }

          return firstError?.message ?? "Invalid dataset name.";
      }

      return null;
  };
```

### Subpath Exports

TypeBox 1.x uses subpath exports. The available subpaths are:
- `typebox` - Main module (Type, Static, etc.)
- `typebox/value` - Value utilities (Value.Check, Value.Errors, etc.)
- `typebox/error` - Error types (not `typebox/errors`)
- `typebox/guard` - Type guards
- `typebox/schema` - Schema utilities
- `typebox/format` - Format utilities
- `typebox/type` - Type utilities
- `typebox/system` - System configuration
- `typebox/compile` - Compiled validators

---

## 5. monaco-editor v0.52 → v0.55 (REQUIRES IMPORT PATH CHANGES)

### What Changed

monaco-editor v0.55 changed its ESM module structure. The deep import path `monaco-editor/esm/vs/editor/editor.api` is no longer the recommended way to import monaco.

### Required Changes

**File:** `client/src/components/SqlEditor/monaco-loader.ts`
```diff
- import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
+ import * as monaco from "monaco-editor";
```

The main `monaco-editor` entry point now correctly exports the ESM module.

---

## 6. @types/node (KEPT AT 22.x)

The `@types/node` package was kept at 22.x (upgraded to 22.19.7) to maintain compatibility with the Node.js 22 LTS target. The 25.x types are for Node.js 25+ which is not an LTS release.

---

## 7. Server Error Handler Type Fix

The server error handler needed a type annotation fix to work with newer Fastify types.

**File:** `server/src/app.ts`
```diff
+ import {FastifyError} from "@fastify/error";

- fastify.setErrorHandler((err, request, reply) => {
+ fastify.setErrorHandler<FastifyError>((err, request, reply) => {
```

This explicitly types the `err` parameter as `FastifyError` which provides access to `statusCode` and other properties.

---

## 7. Removed Overrides (COMPLETED)

The following npm overrides in root `package.json` were removed as they are no longer needed:

```json
"overrides": {
  "react-syntax-highlighter": {
    "refractor": {
      "prismjs": "^1.30.0"
    }
  },
  "monaco-editor": {
    "dompurify": "3.3.1"
  }
}
```

**Reason for removal:**
- **prismjs**: react-syntax-highlighter v16 → refractor v5 now includes prismjs 1.30.0 natively (the secure version)
- **dompurify**: monaco-editor v0.55.1 now includes dompurify 3.2.7 natively (secure). The override was actually causing npm dependency resolution issues.

Removing these overrides reduced the vulnerability count from 28 to 5.

---

## Migration Checklist

### antd v6
- [x] Remove `@ant-design/v5-patch-for-react-19` from `client/package.json` dependencies
- [x] Remove `import "@ant-design/v5-patch-for-react-19";` from `client/src/App.tsx`
- [x] Add `"@ant-design/icons": "^6.1.0"` to `client/package.json` dependencies
- [x] Update `cssVar: true` to `cssVar: {}` in `client/src/theme.tsx`

### TypeBox 1.x Migration
- [x] Replace `@sinclair/typebox` with `typebox` in all package.json files
- [x] Update all imports from `@sinclair/typebox` to `typebox` (15 files)
- [x] Update error checking in `validation.ts` from `ValueErrorType` enum to `keyword` string checks

### monaco-editor v0.55
- [x] Update import from `monaco-editor/esm/vs/editor/editor.api` to `monaco-editor`

### Fastify
- [x] Update `@fastify/type-provider-typebox` to v6 (requires TypeBox 1.x)
- [x] Add `FastifyError` type to error handler in `server/src/app.ts`

### Package Overrides
- [x] Remove obsolete `overrides` from root `package.json` (prismjs and dompurify overrides no longer needed)

### Build Verification
- [x] Run `npm clean-install --workspaces` to update lock file
- [x] Run `npm --workspace common run build` - builds successfully
- [x] Run `npm --workspace client run build` - builds successfully
- [x] Run `npm --workspace server run build` - builds successfully

### Testing (Manual)
- [ ] Run the application and verify all UI components render correctly
- [ ] Run the server and verify all API endpoints work correctly
- [ ] Test syntax highlighting in search results
- [ ] Test static file serving (streams, log-viewer, client assets)
- [ ] Verify custom CSS styles still apply correctly to antd components
- [ ] Test dataset name validation in Ingest page

---

## References

- [Ant Design v5 to v6 Migration Guide](https://ant.design/docs/react/migration-v6/)
- [Ant Design v6 Release Announcement](https://github.com/ant-design/ant-design/issues/55804)
- [TypeBox 1.0 Release](https://github.com/sinclairzx81/typebox/releases/tag/1.0.0)
- [TypeBox GitHub Repository](https://github.com/sinclairzx81/typebox)
- [@fastify/type-provider-typebox v6 Changelog](https://github.com/fastify/fastify-type-provider-typebox/releases/tag/v6.0.0)
- [monaco-editor Releases](https://github.com/microsoft/monaco-editor/releases)
- [react-syntax-highlighter Releases](https://github.com/react-syntax-highlighter/react-syntax-highlighter/releases)
- [@fastify/static Releases](https://github.com/fastify/fastify-static/releases)
