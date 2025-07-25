#!/usr/bin/env bash

# Exit on any error
set -e

# Error on undefined variable
set -u

script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
lib_install_scripts_dir="${script_dir}/.."

# NOTE: The remaining installation scripts depend on boost, so we install it beforehand.
"${lib_install_scripts_dir}/install-boost.sh" 1.87.0

"${lib_install_scripts_dir}/msgpack.sh" 7.0.0
