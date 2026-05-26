# GNOME TTY Dakhilsaver

> A terminal-art screensaver for GNOME — fullscreen [TerminalTextEffects](https://github.com/ChrisBuilds/terminaltexteffects) animations over your own ASCII text, on every monitor.

[![GNOME Shell 50](https://img.shields.io/badge/GNOME%20Shell-50-4A86CF?logo=gnome&logoColor=white)](https://release.gnome.org/)
[![Wayland](https://img.shields.io/badge/Wayland-required-FFB71B)](https://wayland.freedesktop.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

<p align="center">
  <img src="assets/demo.gif" alt="Demo of the screensaver effect revealing the logo" width="720">
</p>

A GNOME Shell 50 extension that opens a fullscreen terminal on every monitor and
runs random TerminalTextEffects animations over editable ASCII text. It starts
automatically after a configurable period of inactivity, and can also be toggled
with a keyboard shortcut.

This is a GNOME implementation of the Hyprland project. It does not use
`hyprctl`: window discovery, monitor placement, fullscreen handling, shortcut
registration, and pointer visibility are all driven by the GNOME Shell
extension, using Mutter's idle monitor for inactivity detection.

## Contents

- [Features](#features)
- [Screenshots](#screenshots)
- [Requirements](#requirements)
- [Install](#install)
- [Usage](#usage)
- [Automatic activation (idle)](#automatic-activation-idle)
- [Settings reference](#settings-reference)
- [Customize the text](#customize-the-text)
- [Terminal selection](#terminal-selection)
- [Architecture](#architecture)
- [Packaging / extensions.gnome.org](#packaging--extensionsgnomeorg)
- [Uninstall](#uninstall)
- [Notes](#notes)

## Features

- **Every monitor, fullscreen.** One screensaver window per display, placed and
  fullscreened independently.
- **Random effects.** A different TerminalTextEffects animation each cycle,
  rendered over text you control.
- **Idle activation.** Starts on its own after a configurable idle timeout
  (default 10 minutes); any key or mouse movement dismisses it.
- **On-demand toggle.** Show or hide it instantly with a keyboard shortcut
  (`Super`+`F12` by default, rebindable).
- **Bring your own terminal.** Auto-detects Ghostty, Kitty, Alacritty, or Foot,
  and you can force a specific one.
- **Editable logo.** A plain text file you can change to anything you like.
- **Pointer hidden** while the effect is active, restored on exit.

## Screenshots

**Multi-monitor** — each display runs its own effect and color cycle:

![The screensaver running across three monitors](assets/multi-monitor.png)

**Single monitor** — the logo fully resolved:

![The screensaver on a single monitor](assets/single-monitor.png)

## Requirements

| Dependency | Why it is needed | Provided by |
|---|---|---|
| GNOME Shell **50** on **Wayland** | Host for the extension | Your desktop |
| `glib-compile-schemas` | Compile the keybinding schema during install | `glib2` |
| `gnome-extensions` CLI | Enable the extension | Ships with GNOME Shell |
| A terminal: **Ghostty**, **Kitty**, **Alacritty**, or **Foot** | Window that hosts the effect | See below |
| `terminaltexteffects` (`tte`) + `python3` | Renders the animations | `pip`/`pipx` or the bundled venv |

`gnome-extensions` is part of GNOME Shell, so if you are running GNOME 50 you
already have it. You only need to install the items below.

### Install dependencies per distribution

Pick **one** terminal in the commands below (the examples use `kitty`; swap it
for `alacritty` or `foot` if you prefer). See [Ghostty](#ghostty) for that
terminal.

**Fedora**

```bash
sudo dnf install glib2 python3 pipx kitty
pipx install terminaltexteffects
```

**Debian / Ubuntu**

```bash
sudo apt install libglib2.0-bin python3-venv pipx kitty
pipx install terminaltexteffects
```

**Arch Linux**

```bash
sudo pacman -S glib2 python python-pipx kitty
pipx install terminaltexteffects
```

**openSUSE**

```bash
sudo zypper install glib2-tools python3 python3-pipx kitty
pipx install terminaltexteffects
```

If you skip `pipx install terminaltexteffects`, `install.sh` will create a
local Python virtual environment and install it there automatically.

### Ghostty

Ghostty is not yet packaged on every distribution. It is in the official Arch
repositories (`sudo pacman -S ghostty`); on other distributions follow the
instructions at <https://ghostty.org/docs/install>. Any of Kitty, Alacritty,
or Foot work as drop-in alternatives.

## Install

```bash
git clone https://github.com/GeorgeDakhil/gnome-tty-dakhilsaver.git
cd gnome-tty-dakhilsaver
./install.sh
```

`install.sh` compiles the schema, copies the extension into
`~/.local/share/gnome-shell/extensions/`, installs the editable text file, and
sets up `terminaltexteffects` in a local venv if `tte` is not already on your
`PATH`.

If this is the first time the extension is installed in the active Wayland
session, log out and back in, then enable it:

```bash
gnome-extensions enable gnome-tty-dakhilsaver@dakhil.local
```

## Usage

Toggle the effect on demand with:

```text
SUPER + F12
```

Press any key inside a screensaver terminal, or press `SUPER + F12` again, to
close the effect on all monitors.

## Automatic activation (idle)

The effect starts on its own after the system has been idle (no keyboard or
pointer input). The default is **600 seconds (10 minutes)**. Moving the mouse
or pressing any key dismisses it.

Change the timeout (in seconds) with `gsettings`:

```bash
SCHEMADIR=~/.local/share/gnome-shell/extensions/gnome-tty-dakhilsaver@dakhil.local/schemas

# 5 minutes
gsettings --schemadir "$SCHEMADIR" \
  set org.gnome.shell.extensions.gnome-tty-dakhilsaver idle-timeout 300

# disable automatic activation (keyboard shortcut only)
gsettings --schemadir "$SCHEMADIR" \
  set org.gnome.shell.extensions.gnome-tty-dakhilsaver idle-timeout 0
```

Changes take effect immediately; no logout is needed.

> If you enable GNOME's own **Settings → Power → Blank Screen**, set this
> timeout shorter than that value, otherwise GNOME blanks the display before
> the effect appears.

## Settings reference

Both settings live in the extension's GSettings schema
(`org.gnome.shell.extensions.gnome-tty-dakhilsaver`). Define the schema
directory once, then read or write either key:

```bash
SCHEMADIR=~/.local/share/gnome-shell/extensions/gnome-tty-dakhilsaver@dakhil.local/schemas
SCHEMA=org.gnome.shell.extensions.gnome-tty-dakhilsaver
```

| Key | Type | Default | Description |
|---|---|---|---|
| `idle-timeout` | integer (seconds, `0`–`86400`) | `600` | Idle seconds before the effect starts automatically. `0` disables idle activation. |
| `toggle-saver` | string array | `['<Super>F12']` | Keyboard shortcut that toggles the effect. |

Rebind the toggle shortcut (uses GTK accelerator syntax):

```bash
# example: Super + Backslash
gsettings --schemadir "$SCHEMADIR" \
  set "$SCHEMA" toggle-saver "['<Super>backslash']"
```

## Customize the text

Edit:

```bash
~/.config/gnome-tty-dakhilsaver/screensaver.txt
```

Any plain text works; for the boxy logo look, paste ASCII art (for example from
[patorjk's Text to ASCII generator](https://patorjk.com/software/taag/)).

## Terminal selection

The launcher selects the first installed terminal in this order:

1. Ghostty
2. Kitty
3. Alacritty
4. Foot

Override it for the GNOME Shell process by setting `DAKHILSAVER_TERMINAL`
before starting the GNOME session.

## Architecture

- `extension/.../extension.js` owns the GNOME Shell integration: idle
  detection (via Mutter's idle monitor), keybinding, one terminal per monitor,
  fullscreen placement, cleanup, and pointer hide.
- `extension/.../bin/gnome-dakhilsaver-launch` selects a terminal and assigns a
  unique application ID per monitor so GNOME Shell can manage the resulting
  window.
- `extension/.../bin/gnome-dakhilsaver-run` loops `tte` and exits when keyboard
  input is received in its terminal.

The helper scripts live inside the extension directory so the whole thing can be
packaged as a single bundle, and they are invoked through `bash` rather than
executed directly — that way they keep working even when installed from a zip,
whose extraction does not preserve the executable bit.

## Packaging / extensions.gnome.org

Build the upload bundle with:

```bash
./pack.sh
```

This produces `gnome-tty-dakhilsaver@dakhil.local.shell-extension.zip`, which you
can install locally:

```bash
gnome-extensions install --force \
  gnome-tty-dakhilsaver@dakhil.local.shell-extension.zip
```

…or upload at <https://extensions.gnome.org/upload/>.

> **Heads-up:** extensions.gnome.org reviews every submission by hand, and this
> extension spawns an external terminal and depends on `terminaltexteffects`
> being installed separately. Extensions that launch external processes are
> scrutinized heavily and may be rejected, so the manual `install.sh` flow above
> remains the primary way to use it.

## Uninstall

```bash
./uninstall.sh
```

Your editable logo file at `~/.config/gnome-tty-dakhilsaver/screensaver.txt` is
kept.

## Notes

This is a visual screensaver effect, not a lock screen. Use GNOME's lock
screen when authentication is required.
</content>
</invoke>
