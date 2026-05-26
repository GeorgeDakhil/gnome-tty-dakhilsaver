# extensions.gnome.org — textos para la subida

Archivo de ayuda (local, no es necesario subirlo al repo). Copia cada bloque
tal cual. Subida: https://extensions.gnome.org/upload/

---

## 1) Descripción pública

Sale en la página de la extensión. Procede del campo `description` de
`metadata.json`. EGO la trata como texto plano y autoenlaza las URLs, por eso
aquí van las URLs completas (sin markdown).

```text
GNOME TTY Dakhilsaver turns your idle screen into a terminal-art screensaver. After a configurable idle period — or instantly with Super+F12 — it opens a fullscreen terminal on every monitor and plays a random TerminalTextEffects animation over editable ASCII text. Move the mouse or press any key to dismiss it.

Requirements (installed separately):
- A terminal emulator: Ghostty, Kitty, Alacritty, or Foot.
- terminaltexteffects (the `tte` command) and Python 3.

Setup, configuration and the idle-timeout / shortcut settings are documented at:
https://github.com/GeorgeDakhil/gnome-tty-dakhilsaver

This is a visual screensaver effect, not a lock screen.
```

---

## 2) Nota para el revisor

EGO no tiene un campo de "mensaje al revisor" en la subida. Guarda esto y
pégalo como **respuesta** cuando un revisor deje un comentario.

```text
Thanks for reviewing!

What it does: on idle (via Mutter's core idle monitor) or via the Super+F12 shortcut, it launches one fullscreen terminal per monitor running terminaltexteffects over editable ASCII text, like a screensaver. Any key or pointer activity dismisses it.

External process: it uses Gio.Subprocess to start a terminal emulator (Ghostty/Kitty/Alacritty/Foot), which runs the bundled bin/gnome-dakhilsaver-run wrapper around the `tte` CLI. The scripts are invoked through bash, so they don't rely on the executable bit surviving zip extraction.

Cleanup: every spawned process is tracked and force_exit()-ed in _stop()/disable(); screensaver windows are deleted and their `unmanaged` signals disconnected; all GLib timeouts and the idle/user-active watches are removed in disable(); the cursor-visibility inhibitor is reference-balanced and released on disable.

Scope: no network access, no telemetry, no filesystem writes beyond creating the user's editable text file (~/.config/gnome-tty-dakhilsaver/screensaver.txt) on first run. Default 'user' session mode (it does not run on the lock screen). The `tte` CLI and the terminal are user-installed dependencies, documented in the README.

Full source, install script and packaging: https://github.com/GeorgeDakhil/gnome-tty-dakhilsaver — License: MIT.
```

---

## 3) Checklist de subida

1. Inicia sesión en https://extensions.gnome.org
2. Abre https://extensions.gnome.org/upload/
3. Sube `gnome-tty-dakhilsaver@dakhil.local.shell-extension.zip`
   (regenéralo antes con `./pack.sh` si cambiaste algo).
4. Confirma GNOME Shell objetivo: 50.
5. Envía a revisión y espera el comentario del revisor (días–semanas).
