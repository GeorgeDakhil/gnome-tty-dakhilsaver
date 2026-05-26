import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const KEYBINDING = 'toggle-saver';
const IDLE_TIMEOUT_KEY = 'idle-timeout';
// The launcher tags each terminal with `${APP_ID_PREFIX}<monitor>`, but some
// terminals (Ghostty in single-instance mode) cannot give each window a
// distinct app id. So matching only relies on APP_ID_BASE, and monitors are
// assigned in window arrival order instead of by the suffix.
const APP_ID_BASE = 'org.gnome_tty_dakhilsaver';
const APP_ID_PREFIX = `${APP_ID_BASE}.monitor_`;
const WINDOW_MATCH_ATTEMPTS = 20;
const PLACE_REASSERT_MS = 350;

export default class GnomeTtyDakhilsaverExtension extends Extension {
    enable() {
        this._running = false;
        this._stopping = false;
        this._processes = new Set();
        this._windows = new Set();
        this._windowUnmanagedIds = new Map();
        this._matchSources = new Set();
        this._assignedMonitors = new Set();
        this._settings = this.getSettings();

        this._idleMonitor = global.backend.get_core_idle_monitor();
        this._idleWatchId = 0;
        this._userActiveWatchId = 0;
        this._cursorInhibited = false;

        this._windowCreatedId = global.display.connect(
            'window-created', (_display, window) => this._watchWindow(window));

        Main.wm.addKeybinding(
            KEYBINDING,
            this._settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            () => this._toggle());

        this._idleTimeoutChangedId = this._settings.connect(
            `changed::${IDLE_TIMEOUT_KEY}`, () => this._armIdleWatch());
        this._armIdleWatch();
    }

    disable() {
        Main.wm.removeKeybinding(KEYBINDING);
        if (this._windowCreatedId) {
            global.display.disconnect(this._windowCreatedId);
            this._windowCreatedId = 0;
        }
        if (this._idleTimeoutChangedId) {
            this._settings.disconnect(this._idleTimeoutChangedId);
            this._idleTimeoutChangedId = 0;
        }

        this._disarmIdleWatch();
        this._stop();
        this._setPointerVisible(true);
        this._idleMonitor = null;
        this._settings = null;
    }

    _armIdleWatch() {
        this._disarmIdleWatch();
        const seconds = this._settings.get_int(IDLE_TIMEOUT_KEY);
        if (seconds <= 0)
            return;
        this._idleWatchId = this._idleMonitor.add_idle_watch(
            seconds * 1000, () => this._onIdle());
    }

    _disarmIdleWatch() {
        if (this._idleWatchId) {
            this._idleMonitor.remove_watch(this._idleWatchId);
            this._idleWatchId = 0;
        }
    }

    _onIdle() {
        if (this._running)
            return;

        this._start();
        if (this._running) {
            this._userActiveWatchId = this._idleMonitor.add_user_active_watch(
                () => this._onUserActive());
        }
    }

    _onUserActive() {
        this._userActiveWatchId = 0;
        this._stop();
    }

    _toggle() {
        if (this._running)
            this._stop();
        else
            this._start();
    }

    _start() {
        this._running = true;
        this._assignedMonitors.clear();
        this._setPointerVisible(false);

        const monitorCount = Math.max(Main.layoutManager.monitors.length, 1);
        for (let monitor = 0; monitor < monitorCount; monitor++) {
            if (!this._launchMonitor(monitor)) {
                this._stop();
                Main.notify('GNOME TTY Dakhilsaver',
                    'Could not open a supported terminal.');
                break;
            }
        }
    }

    _launchMonitor(monitor) {
        const launcher = GLib.build_filenamev([
            this.path, 'bin', 'gnome-dakhilsaver-launch',
        ]);
        const appId = `${APP_ID_PREFIX}${monitor}`;

        try {
            // Invoke through `bash` rather than executing the script directly:
            // when the extension is installed from an extensions.gnome.org zip,
            // the archive extraction does not preserve the executable bit, so
            // the bundled scripts cannot be exec'd by path.
            const process = Gio.Subprocess.new(
                ['bash', launcher, appId],
                Gio.SubprocessFlags.STDOUT_SILENCE |
                    Gio.SubprocessFlags.STDERR_SILENCE);
            this._processes.add(process);
            process.wait_async(null, (source, result) => {
                try {
                    source.wait_finish(result);
                } catch (error) {
                    logError(error);
                }
                this._processes.delete(source);
                if (this._running && !this._stopping)
                    this._stop();
            });
            return true;
        } catch (error) {
            logError(error, 'Failed to launch GNOME TTY Dakhilsaver');
            return false;
        }
    }

    _watchWindow(window) {
        if (!this._running)
            return;

        let attempts = 0;
        const sourceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, () => {
            if (!this._running || this._windows.has(window)) {
                this._matchSources.delete(sourceId);
                return GLib.SOURCE_REMOVE;
            }

            if (this._manageWindow(window)) {
                this._matchSources.delete(sourceId);
                return GLib.SOURCE_REMOVE;
            }

            attempts++;
            if (attempts >= WINDOW_MATCH_ATTEMPTS) {
                this._matchSources.delete(sourceId);
                return GLib.SOURCE_REMOVE;
            }
            return GLib.SOURCE_CONTINUE;
        });
        this._matchSources.add(sourceId);
    }

    _manageWindow(window) {
        if (this._windows.has(window))
            return true;

        const identities = [
            window.get_wm_class(),
            window.get_wm_class_instance(),
            window.get_gtk_application_id(),
        ].filter(identity => identity);
        const matched = identities.some(value =>
            value.startsWith(APP_ID_BASE));
        if (!matched)
            return false;

        // Assign each screensaver window to the next free monitor in arrival
        // order, so placement does not depend on the terminal giving each
        // window a distinct app id.
        const total = Math.max(Main.layoutManager.monitors.length, 1);
        let target = -1;
        for (let i = 0; i < total; i++) {
            if (!this._assignedMonitors.has(i)) {
                target = i;
                break;
            }
        }
        if (target < 0)
            return true;

        this._assignedMonitors.add(target);
        this._windows.add(window);

        const unmanagedId = window.connect('unmanaged', () => {
            this._windows.delete(window);
            this._assignedMonitors.delete(target);
            this._windowUnmanagedIds.delete(window);
            if (this._running && !this._stopping)
                this._stop();
        });
        this._windowUnmanagedIds.set(window, unmanagedId);

        this._placeOnMonitor(window, target);

        // Wayland configure is async, so the placement may not land on the
        // first try. Re-assert once the client has acknowledged.
        const reassert = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT, PLACE_REASSERT_MS, () => {
                this._matchSources.delete(reassert);
                if (this._windows.has(window) &&
                    window.get_monitor() !== target)
                    this._placeOnMonitor(window, target);
                return GLib.SOURCE_REMOVE;
            });
        this._matchSources.add(reassert);
        return true;
    }

    _placeOnMonitor(window, target) {
        const monitors = Main.layoutManager.monitors;
        const idx = Math.min(target, monitors.length - 1);
        const geom = monitors[idx];

        // make_fullscreen() fullscreens on whichever monitor the window sits
        // on, so move it into the target monitor's rectangle first. This is
        // more reliable on Wayland than move_to_monitor() alone.
        if (window.is_fullscreen())
            window.unmake_fullscreen();
        if (geom)
            window.move_frame(false, geom.x + 20, geom.y + 20);
        window.move_to_monitor(idx);
        window.make_fullscreen();
    }

    _stop() {
        if (!this._running && this._processes.size === 0)
            return;

        this._stopping = true;
        this._running = false;
        this._setPointerVisible(true);

        if (this._userActiveWatchId) {
            this._idleMonitor.remove_watch(this._userActiveWatchId);
            this._userActiveWatchId = 0;
        }

        for (const sourceId of this._matchSources)
            GLib.source_remove(sourceId);
        this._matchSources.clear();

        const timestamp = global.display.get_current_time_roundtrip();
        for (const window of this._windows) {
            const unmanagedId = this._windowUnmanagedIds.get(window);
            if (unmanagedId)
                window.disconnect(unmanagedId);
            window.delete(timestamp);
        }
        this._windowUnmanagedIds.clear();
        this._windows.clear();
        this._assignedMonitors.clear();

        for (const process of this._processes)
            process.force_exit();
        this._processes.clear();
        this._stopping = false;
    }

    _setPointerVisible(visible) {
        // GNOME 50 hides the pointer through a reference-counted inhibitor on
        // the cursor tracker. Keep the inhibit/uninhibit calls balanced.
        try {
            const tracker = global.backend.get_cursor_tracker();
            if (!visible && !this._cursorInhibited) {
                tracker.inhibit_cursor_visibility();
                this._cursorInhibited = true;
            } else if (visible && this._cursorInhibited) {
                tracker.uninhibit_cursor_visibility();
                this._cursorInhibited = false;
            }
        } catch {
        }
    }
}
