# PR Title

```
feat(webui): Upgrade monaco-editor to v0.55.
```

# Description

Update monaco-editor from 0.54.0 to 0.55.1.

The v0.55 release changed the ESM module structure, requiring the import path
to be updated from `monaco-editor/esm/vs/editor/editor.api` to the main
`monaco-editor` entry point.

# Checklist

* [x] The PR satisfies the [contribution guidelines][yscope-contrib-guidelines].
* [x] This is a breaking change and that has been indicated in the PR title, OR this isn't a
  breaking change.
* [x] Necessary docs have been updated, OR no docs need to be updated.

# Validation performed

- Verified `npm install --workspaces` completes successfully.
- Verified `npm --workspace client run build` completes successfully.

[yscope-contrib-guidelines]: https://docs.yscope.com/dev-guide/contrib-guides-overview.html
