#!/usr/bin/env bash
# Build the extensions.gnome.org upload bundle.
#
# Produces gnome-tty-dakhilsaver@dakhil.local.shell-extension.zip in the repo
# root, ready to upload at https://extensions.gnome.org/upload/ or to install
# locally with:
#
#   gnome-extensions install --force \
#     gnome-tty-dakhilsaver@dakhil.local.shell-extension.zip
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UUID="gnome-tty-dakhilsaver@dakhil.local"
SRC="$ROOT/extension/$UUID"

# --extra-source=bin bundles the launcher/runner scripts (gnome-extensions pack
# only ships extension.js, metadata.json, prefs.js, stylesheet, schemas and
# locale by default). The scripts are run through `bash`, so they do not rely
# on the executable bit surviving zip extraction.
gnome-extensions pack "$SRC" \
  --extra-source=bin \
  --schema="$SRC/schemas/org.gnome.shell.extensions.gnome-tty-dakhilsaver.gschema.xml" \
  --out-dir="$ROOT" \
  --force

echo "Built: $ROOT/$UUID.shell-extension.zip"
