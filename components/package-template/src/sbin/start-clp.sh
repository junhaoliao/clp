#!/usr/bin/env bash

script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
package_root="$script_dir/.."

touch "$package_root/.env"
mkdir -p "$package_root/var/log"
mkdir -p "$package_root/var/data"

export CLP_PACKAGE_CONTAINER=$(cat "$package_root/image.id")
docker compose run --rm init
