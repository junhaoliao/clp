# PR Title

```
feat(webui): Migrate to TypeBox 1.x.
```

# Description

Migrate from `@sinclair/typebox` (0.34.x) to `typebox` (1.x). The TypeBox
library was renamed from `@sinclair/typebox` to `typebox` in version 1.0.

This migration is required because `@fastify/type-provider-typebox` v6 changed
its peer dependency from `@sinclair/typebox` to `typebox` v1.

Changes:
- Replace `@sinclair/typebox` with `typebox` in all package.json files
- Update `@fastify/type-provider-typebox` from v5 to v6
- Update all import paths from `@sinclair/typebox` to `typebox`
- Update `validation.ts` to use the new error API (`keyword` property instead
  of `ValueErrorType` enum)
- Add `FastifyError` type annotation to the server error handler

Files with import path changes:
- `common/src/schemas/*.ts` (9 files)
- `client/src/typings/query.ts`
- `client/src/pages/IngestPage/Compress/validation.ts`
- `client/src/pages/LogViewerLoadingPage/QueryStatus.tsx`
- `server/src/routes/api/compress-metadata/utils.ts`
- `server/src/routes/api/example/index.ts`
- `server/src/typings/stream-files.ts`

# Checklist

* [x] The PR satisfies the [contribution guidelines][yscope-contrib-guidelines].
* [x] This is a breaking change and that has been indicated in the PR title, OR this isn't a
  breaking change.
* [x] Necessary docs have been updated, OR no docs need to be updated.

# Validation performed

- Verified `npm install --workspaces` completes successfully.
- Verified `npm --workspace common run build` completes successfully.
- Verified `npm --workspace client run build` completes successfully.
- Verified `npm --workspace server run build` completes successfully.

[yscope-contrib-guidelines]: https://docs.yscope.com/dev-guide/contrib-guides-overview.html
