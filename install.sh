#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
DATA_HOME="${XDG_DATA_HOME:-$HOME/.local/share}"
UUID="gnome-tty-dakhilsaver@dakhil.local"
CONFIG_DIR="$CONFIG_HOME/gnome-tty-dakhilsaver"
DATA_DIR="$DATA_HOME/gnome-tty-dakhilsaver"
EXTENSION_DIR="$DATA_HOME/gnome-shell/extensions/$UUID"

install_tte() {
  if command -v tte >/dev/null 2>&1 || [[ -x "$DATA_DIR/venv/bin/tte" ]]; then
    return 0
  fi

  if ! command -v python3 >/dev/null 2>&1; then
    echo "python3 is required to install terminaltexteffects." >&2
    return 1
  fi

  echo "Installing terminaltexteffects into $DATA_DIR/venv"
  python3 -m venv "$DATA_DIR/venv"
  "$DATA_DIR/venv/bin/pip" install --upgrade pip
  "$DATA_DIR/venv/bin/pip" install terminaltexteffects
}

mkdir -p "$EXTENSION_DIR/bin" "$EXTENSION_DIR/schemas"
install -Dm755 "$ROOT/extension/$UUID/bin/gnome-dakhilsaver-launch" \
  "$EXTENSION_DIR/bin/gnome-dakhilsaver-launch"
install -Dm755 "$ROOT/extension/$UUID/bin/gnome-dakhilsaver-run" \
  "$EXTENSION_DIR/bin/gnome-dakhilsaver-run"
install -Dm644 "$ROOT/extension/$UUID/extension.js" "$EXTENSION_DIR/extension.js"
install -Dm644 "$ROOT/extension/$UUID/metadata.json" "$EXTENSION_DIR/metadata.json"
install -Dm644 "$ROOT/extension/$UUID/schemas/org.gnome.shell.extensions.gnome-tty-dakhilsaver.gschema.xml" \
  "$EXTENSION_DIR/schemas/org.gnome.shell.extensions.gnome-tty-dakhilsaver.gschema.xml"
glib-compile-schemas "$EXTENSION_DIR/schemas"

if [[ ! -f "$CONFIG_DIR/screensaver.txt" ]]; then
  install -Dm644 "$ROOT/config/screensaver.txt" "$CONFIG_DIR/screensaver.txt"
fi

if ! install_tte; then
  cat >&2 <<EOF

The GNOME extension was installed, but terminaltexteffects was not.
Install it manually with pipx or rerun this installer when Python is available.
EOF
fi

if gnome-extensions enable "$UUID" >/dev/null 2>&1; then
  enable_message="The extension is enabled."
else
  enable_message="Log out and back in, then run: gnome-extensions enable $UUID"
fi

cat <<EOF
Installed GNOME TTY Dakhilsaver.

$enable_message
Toggle shortcut:
  SUPER + F12

Logo text:
  $CONFIG_DIR/screensaver.txt
EOF

