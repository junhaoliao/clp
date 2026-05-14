#!/usr/bin/env python3
"""Rewrites pnpm-workspace.yaml for the flattened build output directory.

The webui build output contains a flat copy of built packages (server/,
common/, datasource/) instead of the original monorepo structure
(apps/*, packages/*). This script rewrites the workspace packages list
to point to the actual directories so that `pnpm install --prod` can
resolve workspace dependencies correctly.
"""

import sys

import yaml

# Directories in the build output that contain package.json files
BUILD_OUTPUT_PACKAGES = [
    "server",
    "common",
    "datasource",
]


def main() -> None:
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <workspace-yaml-path>", file=sys.stderr)
        sys.exit(1)

    workspace_yaml_path = sys.argv[1]

    with open(workspace_yaml_path) as f:
        data = yaml.safe_load(f)

    if data is None:
        data = {}

    # Replace monorepo glob patterns with the actual directories that
    # exist in the flattened build output
    data["packages"] = BUILD_OUTPUT_PACKAGES

    with open(workspace_yaml_path, "w") as f:
        yaml.dump(data, f, default_flow_style=False)


if __name__ == "__main__":
    main()
