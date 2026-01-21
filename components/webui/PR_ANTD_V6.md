# PR Title

```
feat(webui): Upgrade antd to v6.
```

# Description

Upgrade Ant Design from v5 to v6.

Changes:
- Update `antd` from 5.27.5 to 6.2.1
- Add `@ant-design/icons` as an explicit dependency (v6.1.0) for version
  compatibility
- Remove `@ant-design/v5-patch-for-react-19` as v6 has native React 19 support
- Update theme configuration to use `cssVar: {}` instead of `cssVar: true`
  (API change in v6)

# Checklist

* [x] The PR satisfies the [contribution guidelines][yscope-contrib-guidelines].
* [x] This is a breaking change and that has been indicated in the PR title, OR this isn't a
  breaking change.
* [x] Necessary docs have been updated, OR no docs need to be updated.

# Validation performed

- Verified `npm install --workspaces` completes successfully.
- Verified `npm --workspace client run build` completes successfully.

[yscope-contrib-guidelines]: https://docs.yscope.com/dev-guide/contrib-guides-overview.html
