"""rockdesk-mcp: starts RockDesk's built-in MCP server (`rds mcp`, stdio).

RockDesk itself must be installed: https://rockdesk.io/#download (China: https://rockdesk.cn/#download)
"""
import os
import shutil
import subprocess
import sys

__version__ = "1.0.18.post1"

_WIN = sys.platform.startswith("win")


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
    if sys.platform == "darwin":
        c += ["/Applications/rockd.app/Contents/MacOS/rds",
              os.path.expanduser("~/Applications/rockd.app/Contents/MacOS/rds"),
              "/opt/homebrew/bin/rds", "/usr/local/bin/rds"]
    elif _WIN:
        for v in ("ProgramFiles", "ProgramW6432", "ProgramFiles(x86)"):
            if os.environ.get(v):
                c.append(os.path.join(os.environ[v], "rockd", "rds.exe"))
    else:
        c += ["/usr/bin/rds", "/usr/local/bin/rds"]
    found = shutil.which("rds.exe" if _WIN else "rds")
    if found:
        c.append(found)
    for d in os.environ.get("PATH", "").split(os.pathsep):
        if d:
            c.append(os.path.join(d, "rds.exe" if _WIN else "rds"))
    return c


def find_rds():
    for p in _candidates():
        if _is_native_rds(p):
            return p
    return None


def main():
    rds = find_rds()
    if not rds:
        sys.stderr.write(
            "rockdesk-mcp: RockDesk is not installed on this computer (its `rds` command was not found).\n"
            "  Install RockDesk from https://rockdesk.io/#download (China: https://rockdesk.cn/#download),\n"
            "  open it once, then restart your AI tool. To point at a custom location, set RDS=/path/to/rds.\n"
            "rockdesk-mcp：这台电脑还没装 RockDesk（找不到它的 rds 命令）。请到 https://rockdesk.cn/#download 下载安装、打开一次，再重启 AI 工具。\n")
        sys.exit(1)
    args = [rds, "mcp"] + sys.argv[1:]
    if _WIN:
        sys.exit(subprocess.call(args))
    os.execv(rds, args)
