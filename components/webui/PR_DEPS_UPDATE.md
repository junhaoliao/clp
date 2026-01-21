# PR Title

```
chore(webui): Update dependencies to latest versions.
```

# Description

Update client and server dependencies to their latest versions. This PR includes
minor and patch version updates that do not require any code changes.

Notable updates:
- react-syntax-highlighter 15.x → 16.x (refractor v5 with secure prismjs)
- @fastify/static 8.x → 9.x (dependency updates only)
- @aws-sdk packages updated to 3.971.0
- React ecosystem packages updated (react, react-dom, react-router)

Also removes obsolete npm overrides for `prismjs` and `dompurify` from the root
package.json, as the updated versions of `react-syntax-highlighter` and
`monaco-editor` already include secure versions of these transitive dependencies.

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
