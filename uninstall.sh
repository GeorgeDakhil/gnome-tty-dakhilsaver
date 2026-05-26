#!/usr/bin/env bash
set -euo pipefail

DATA_HOME="${XDG_DATA_HOME:-$HOME/.local/share}"
UUID="gnome-tty-dakhilsaver@dakhil.local"
EXTENSION_DIR="$DATA_HOME/gnome-shell/extensions/$UUID"

gnome-extensions disable "$UUID" >/dev/null 2>&1 || true
rm -rf "$EXTENSION_DIR" "$DATA_HOME/gnome-tty-dakhilsaver"

cat <<EOF
Uninstalled GNOME TTY Dakhilsaver.

Kept your editable logo file, if present:
  ${XDG_CONFIG_HOME:-$HOME/.config}/gnome-tty-dakhilsaver/screensaver.txt
EOF

