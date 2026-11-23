"""rockdesk-mcp: starts RockDesk's built-in MCP server (`rds mcp`, stdio).

RockDesk has to be installed on this computer and on the one you control: https://rockdesk.io/#download
(China: https://rockdesk.cn/#download).

If RockDesk is not installed here yet, this runs a small setup MCP server instead, so the agent can tell the user
what is missing: `rockdesk_status` explains it, and `install_rockdesk` (only with confirm=true, after the user agrees)
downloads the official installer for this system, installs it, then hands over to `rds mcp` and tells the client
that the tool list changed.

Environment: RDS=/path/to/rds (custom location); ROCKDESK_DOWNLOAD_BASE=https://rockdesk.cn (download site);
for testing: ROCKDESK_MCP_ASSUME_MISSING=1 (act as if RockDesk were not installed), ROCKDESK_MCP_DRY_RUN=1
(download and check the installer, but do not install it).
"""
import json
import locale
import os
import platform
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request

__version__ = "1.0.21"

_WIN = sys.platform.startswith("win")
_MAC = sys.platform == "darwin"


def _is_native_rds(path):
    # The old RockDesk app also ships an `rds`, as a two-line shell script; RockDesk's current `rds` is a native binary.
    try:
        if not os.path.isfile(path):
            return False
        with open(path, "rb") as f:
            return f.read(2) != b"#!"
    except OSError:
        return False


def _candidates():
    c = []
    if os.environ.get("RDS"):
        c.append(os.environ["RDS"])
    if _MAC:
        c += ["/Applications/rockd.app/Contents/MacOS/rds",
              os.path.expanduser("~/Applications/rockd.app/Contents/MacOS/rds"),
              "/opt/homebrew/bin/rds", "/usr/local/bin/rds"]
    elif _WIN:
        for v in ("ProgramFiles", "ProgramW6432", "ProgramFiles(x86)"):
            if os.environ.get(v):
                c.append(os.path.join(os.environ[v], "rockd", "rds.exe"))
    else:
        c += ["/usr/bin/rds", "/usr/local/bin/rds", "/opt/rockd/bin/rds"]
    found = shutil.which("rds.exe" if _WIN else "rds")
    if found:
        c.append(found)
    for d in os.environ.get("PATH", "").split(os.pathsep):
        if d:
            c.append(os.path.join(d, "rds.exe" if _WIN else "rds"))
    return c


def find_rds(honor_test_switch=True):
    if honor_test_switch and os.environ.get("ROCKDESK_MCP_ASSUME_MISSING"):
        return None
    for p in _candidates():
        if _is_native_rds(p):
            return p
    return None


# ---------- RockDesk is not installed: setup server ----------

def _china():
    tz = os.environ.get("TZ", "")
    if not tz and not _WIN:
        try:
            tz = os.path.realpath("/etc/localtime")
        except OSError:
            tz = ""
    if _WIN and not tz:
        try:
            tz = subprocess.run(["tzutil", "/g"], capture_output=True, text=True, timeout=5).stdout
        except Exception:
            tz = ""
    lang = os.environ.get("LC_ALL") or os.environ.get("LANG") or ""
    return bool(re.search(r"Asia/(Shanghai|Chongqing|Chungking|Harbin|Urumqi|Kashgar)|\bPRC\b|China Standard Time", tz)) \
        or bool(re.match(r"zh[_-]CN", lang, re.I))


def _download_base():
    if os.environ.get("ROCKDESK_DOWNLOAD_BASE"):
        return os.environ["ROCKDESK_DOWNLOAD_BASE"].rstrip("/")
    return "https://rockdesk.cn" if _china() else "https://rockdesk.io"


def _package():
    m = platform.machine().lower()
    if _WIN:
        return "windows", ".exe"
    if _MAC:
        return ("macos" if m in ("arm64", "aarch64") else "macos-x86_64"), ".dmg"
    if sys.platform.startswith("linux"):
        if m in ("x86_64", "amd64"):
            return "linux-amd64", ".deb"
        if m in ("aarch64", "arm64"):
            return "linux-arm64", ".deb"
    return None, None


def _download(url, dest, on_progress=None):
    req = urllib.request.Request(url, headers={"User-Agent": "rockdesk-mcp/" + __version__})
    with urllib.request.urlopen(req, timeout=60) as r, open(dest, "wb") as f:
        total = int(r.headers.get("Content-Length") or 0)
        got = 0
        while True:
            chunk = r.read(1 << 16)
            if not chunk:
                break
            f.write(chunk)
            got += len(chunk)
            if on_progress:
                on_progress(got, total)
    if total and got != total:
        raise RuntimeError("download incomplete (%d of %d bytes)" % (got, total))
    return got


def _run(args):
    # Read bytes and decode here: rds prints UTF-8, but text=True would decode with the system code page (GBK on
    # Chinese Windows), and a decode error there kills subprocess's reader thread.
    try:
        r = subprocess.run(args, capture_output=True)
    except OSError as e:
        return False, None, str(e)
    raw = (r.stdout or b"") + (r.stderr or b"")
    try:
        out = raw.decode("utf-8")
    except UnicodeDecodeError:
        out = raw.decode(locale.getpreferredencoding(False) or "utf-8", "replace")
    return r.returncode == 0, r.returncode, out.strip()


def _install(path):
    """Installs the downloaded package; returns notes for the user. Raises RuntimeError if it cannot."""
    notes = []
    if _WIN:
        # Start-Process goes through ShellExecute, so Windows shows the UAC prompt the installer needs. Not -Wait: it also
        # waits for every process the installer started, including the RockDesk app it opens at the end, so it never returns.
        ps = ("$p = Start-Process -FilePath '%s' -ArgumentList '/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/SP-' "
              "-PassThru; $p.WaitForExit(); exit $p.ExitCode") % path.replace("'", "''")
        ok, code, out = _run(["powershell", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", ps])
        if not ok:
            raise RuntimeError("the installer did not finish (exit %s%s). If a UAC prompt was declined, run it again; "
                               "or the user can run %s themselves." % (code, (": " + out[-300:]) if out else "", path))
        return notes
    if _MAC:
        mnt = tempfile.mkdtemp(prefix="rockdesk-dmg-")
        ok, _, out = _run(["hdiutil", "attach", "-nobrowse", "-readonly", "-mountpoint", mnt, path])
        if not ok:
            raise RuntimeError("could not open the disk image: " + out[-300:])
        try:
            app = os.path.join(mnt, "rockd.app")
            if not os.path.isdir(app):
                raise RuntimeError("rockd.app is not in the disk image")
            d = "/Applications"
            if not os.access(d, os.W_OK):
                d = os.path.expanduser("~/Applications")
                os.makedirs(d, exist_ok=True)
            dest = os.path.join(d, "rockd.app")
            ok, _, out = _run(["ditto", app, dest])
            if not ok:
                raise RuntimeError("could not copy RockDesk into %s: %s" % (d, out[-300:]))
            _run(["open", dest])
            notes.append("RockDesk was copied into %s and opened. macOS will ask the user to allow Screen Recording and "
                         "Accessibility for it the first time someone views or controls this Mac." % d)
        finally:
            _run(["hdiutil", "detach", mnt])
        return notes
    # Linux: the .deb needs root.
    if not shutil.which("apt-get"):
        raise RuntimeError("this system has no apt-get; RockDesk ships .deb packages for Debian / Ubuntu. "
                           "The package is at " + path + ".")
    if hasattr(os, "getuid") and os.getuid() == 0:
        attempts = [["apt-get", "install", "-y", path]]
    else:
        attempts = [["sudo", "-n", "apt-get", "install", "-y", path], ["pkexec", "apt-get", "install", "-y", path]]
    done = False
    for a in attempts:
        if a[0] != "apt-get" and not shutil.which(a[0]):
            continue
        if _run(a)[0]:
            done = True
            break
    if not done:
        raise RuntimeError("installing needs administrator rights and none could be obtained here. Ask the user to "
                           "run this in a terminal, then try again: sudo apt install " + path)
    # The package does not start the per-user background service by itself.
    if _run(["systemctl", "--user", "enable", "--now", "rockd"])[0]:
        notes.append("Its background service is running for this user (systemctl --user enable --now rockd).")
    else:
        notes.append("Start its background service once: open the RockDesk app, or run `systemctl --user enable --now "
                     "rockd` (on a server without a desktop: `sudo systemctl enable --now rockd`).")
    return notes


NOT_INSTALLED = (
    "RockDesk is not installed on this computer, so the RockDesk tools (shell, copy, screenshot, click, clipboard, "
    "forwarding, ...) are not available yet. Ask the user whether to install it now; if they agree, call "
    "install_rockdesk with confirm=true. The computer they want to control needs RockDesk too: "
    "https://rockdesk.io/#download (China: https://rockdesk.cn/#download).\n"
    "这台电脑还没装 RockDesk，所以 RockDesk 的工具（跑命令、传文件、截屏、键鼠、剪贴板、转发……）还用不了。"
    "先问用户要不要现在安装；同意的话用 confirm=true 调用 install_rockdesk。要控制的那台电脑也得装 RockDesk：https://rockdesk.cn/#download")

TOOLS = [
    {
        "name": "install_rockdesk",
        "title": "Install RockDesk",
        "description": (
            "RockDesk is not installed on this computer, which is why its remote-control tools are missing. Only call "
            "this after the user has agreed to install it, with confirm=true. It downloads the official RockDesk package "
            "for this system from rockdesk.io (rockdesk.cn in China) and installs it: on Windows the installer runs "
            "silently (the user may have to approve a UAC prompt), on macOS RockDesk is copied into Applications and "
            "opened, on Linux the .deb is installed with apt (needs administrator rights). When it finishes, the "
            "RockDesk tools are loaded here."),
        "inputSchema": {
            "type": "object",
            "properties": {"confirm": {"type": "boolean",
                                       "description": "true once the user has agreed to install RockDesk on this computer"}},
            "required": ["confirm"],
        },
    },
    {
        "name": "rockdesk_status",
        "title": "Why RockDesk tools are missing",
        "description": "Explains why the RockDesk tools are not available yet and how to get started (download links, "
                       "what the other computer needs).",
        "inputSchema": {"type": "object", "properties": {}},
    },
]

_out_lock = threading.Lock()


def _send(obj):
    data = json.dumps(obj, ensure_ascii=False) + "\n"
    with _out_lock:
        sys.stdout.buffer.write(data.encode("utf-8"))
        sys.stdout.buffer.flush()


def _write_raw(line):
    with _out_lock:
        sys.stdout.buffer.write(line if line.endswith(b"\n") else line + b"\n")
        sys.stdout.buffer.flush()


def _handoff(rds, init_params):
    """Starts `rds mcp`, replays the client's initialize to it; returns the child once it answered."""
    child = subprocess.Popen([rds, "mcp"] + sys.argv[1:], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    hid = "rockdesk-mcp-handoff"
    params = init_params or {"protocolVersion": "2025-06-18", "capabilities": {},
                             "clientInfo": {"name": "rockdesk-mcp", "version": __version__}}
    child.stdin.write((json.dumps({"jsonrpc": "2.0", "id": hid, "method": "initialize", "params": params}) + "\n").encode())
    child.stdin.flush()
    answered = threading.Event()

    def pump():
        for line in iter(child.stdout.readline, b""):
            if not answered.is_set():
                try:
                    m = json.loads(line)
                except ValueError:
                    continue
                if m.get("id") == hid:
                    answered.set()
                continue
            _write_raw(line)
        code = child.wait()
        os._exit(1 if code is None else code)

    threading.Thread(target=pump, daemon=True).start()
    if not answered.wait(20):
        child.kill()
        raise RuntimeError("rds mcp did not answer in 20 s")
    child.stdin.write((json.dumps({"jsonrpc": "2.0", "method": "notifications/initialized"}) + "\n").encode())
    child.stdin.flush()
    return child


def _setup_server():
    init_params = None
    proxy = None

    def text(i, t, is_error=False):
        r = {"content": [{"type": "text", "text": t}]}
        if is_error:
            r["isError"] = True
        _send({"jsonrpc": "2.0", "id": i, "result": r})

    def install(msg):
        nonlocal proxy
        i = msg.get("id")
        token = ((msg.get("params") or {}).get("_meta") or {}).get("progressToken")
        name, ext = _package()
        if not name:
            return text(i, "RockDesk has no package for %s %s. See https://rockdesk.io/#download"
                        % (sys.platform, platform.machine()), True)
        url = "%s/download/latest/%s" % (_download_base(), name)
        path = os.path.join(tempfile.gettempdir(), "rockdesk-%s-%d%s" % (name, int(time.time() * 1000), ext))
        last = [-1]

        def progress(got, total):
            if not token or not total:
                return
            pct = got * 100 // total // 10 * 10
            if pct != last[0]:
                last[0] = pct
                _send({"jsonrpc": "2.0", "method": "notifications/progress",
                       "params": {"progressToken": token, "progress": got, "total": total,
                                  "message": "downloading RockDesk %d%%" % pct}})
        try:
            got = _download(url, path, progress)
            if os.environ.get("ROCKDESK_MCP_DRY_RUN"):
                return text(i, "Dry run: downloaded %d bytes from %s to %s; not installed." % (got, url, path))
            notes = _install(path)
            try:
                os.remove(path)
            except OSError:
                pass
            rds = find_rds(honor_test_switch=False)
            if not rds:
                return text(i, "The installer finished, but RockDesk's rds command is still not found. Ask the user to "
                               "open the RockDesk app once, then restart this tool. " + " ".join(notes), True)
            ver = (_run([rds, "--version"])[2].splitlines() or [""])[0].strip()
            try:
                proxy = _handoff(rds, init_params)
                loaded = "and its tools are now loaded here (if they do not show up, restart this MCP server or the client)."
            except Exception as e:
                loaded = "but its tools could not be loaded here (%s): restart this MCP server or the client to use them." % e
            text(i, "\n".join(["RockDesk is installed on this computer (%s), %s" % (ver, loaded)] + notes + [
                "The computer the user wants to control needs RockDesk too (https://rockdesk.io/#download, China: "
                "https://rockdesk.cn/#download): they read its 9-digit ID in the app there and choose how you may connect "
                "(its password, a click on \"allow\", or the same account). New devices start with a free trial."]))
            if proxy:
                _send({"jsonrpc": "2.0", "method": "notifications/tools/list_changed"})
        except Exception as e:
            text(i, "Installing RockDesk did not work: %s\nThe user can install it themselves: https://rockdesk.io/#download "
                    "(China: https://rockdesk.cn/#download)." % e, True)

    def handle(msg):
        nonlocal init_params
        i = msg.get("id")
        is_req = i is not None
        method = msg.get("method")
        if method == "initialize":
            init_params = msg.get("params") or {}
            want = init_params.get("protocolVersion")
            known = ["2025-06-18", "2025-03-26", "2024-11-05"]
            return _send({"jsonrpc": "2.0", "id": i, "result": {
                "protocolVersion": want if want in known else known[0],
                "capabilities": {"tools": {"listChanged": True}},
                "serverInfo": {"name": "rockdesk", "title": "RockDesk (setup)", "version": __version__},
                "instructions": NOT_INSTALLED}})
        if method == "ping":
            return is_req and _send({"jsonrpc": "2.0", "id": i, "result": {}})
        if method == "tools/list":
            return _send({"jsonrpc": "2.0", "id": i, "result": {"tools": TOOLS}})
        if method == "tools/call":
            p = msg.get("params") or {}
            name, args = p.get("name"), p.get("arguments") or {}
            if name == "rockdesk_status":
                return text(i, NOT_INSTALLED)
            if name == "install_rockdesk":
                if args.get("confirm") is not True:
                    return text(i, "Ask the user first whether to install RockDesk on this computer, then call "
                                   "install_rockdesk with confirm=true.")
                return install(msg)
            return text(i, NOT_INSTALLED, True)
        if is_req:
            _send({"jsonrpc": "2.0", "id": i, "error": {"code": -32601, "message": "Method not found: %s" % method}})

    for raw in iter(sys.stdin.buffer.readline, b""):
        if proxy:
            proxy.stdin.write(raw if raw.endswith(b"\n") else raw + b"\n")
            proxy.stdin.flush()
            continue
        if not raw.strip():
            continue
        try:
            msg = json.loads(raw)
        except ValueError:
            _send({"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": "Parse error"}})
            continue
        try:
            handle(msg)
        except Exception as e:
            if isinstance(msg, dict) and msg.get("id") is not None:
                _send({"jsonrpc": "2.0", "id": msg["id"], "error": {"code": -32603, "message": str(e)}})
    if proxy:
        proxy.stdin.close()
        proxy.wait()


def main():
    rds = find_rds()
    if not rds:
        _setup_server()
        return
    args = [rds, "mcp"] + sys.argv[1:]
    if _WIN:
        sys.exit(subprocess.call(args))
    os.execv(rds, args)
