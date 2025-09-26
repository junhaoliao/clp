#!/usr/bin/env bash

set -e  # Exit on any error

script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
package_root="$script_dir/.."

# Check if we're in the right directory with docker-compose files
if [[ ! -f "$package_root/../docker-compose.yaml" && ! -f "$package_root/../docker-compose.yml" ]]; then
    # If not, try to find docker-compose files in the package directory
    if [[ -f "./docker-compose.yaml" || -f "./docker-compose.yml" ]]; then
        compose_dir="."
    elif [[ -f "tools/deployment/package/docker-compose.yaml" ]]; then
        compose_dir="tools/deployment/package"
    elif [[ -f "build/clp-package/docker-compose.yaml" ]]; then
        compose_dir="build/clp-package"
    else
        echo "Error: Could not find docker-compose.yaml/yml file. Please run this from a directory containing the docker-compose files." >&2
        exit 1
    fi
else
    compose_dir="$package_root/.."
fi

# Change to the directory with docker-compose files and run the service
pushd "$compose_dir" > /dev/null
docker compose run --rm \
    -e "PYTHONPATH=/opt/clp/package-venv/lib/python3.10/site-packages" \
    -v "${CLP_LOGS_DIR_HOST:-./var/log}/.clp-config.yml:/etc/clp-config.yml:ro" \
    -v "/:/mnt/logs:ro" \
    clp-package-init \
    python3 -m clp_package_utils.scripts.search "$@"
popd > /dev/null
