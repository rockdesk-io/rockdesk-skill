# RockDesk skill and MCP server for Claude Code, Codex, Gemini CLI, DeepSeek Harness and other agents

Let Claude Code, Codex or any MCP client control another computer: run shell commands, read and write files, mount its folders, take screenshots, move the mouse and type, on Windows, macOS, Linux or Android. Connect by a 9-digit RockDesk ID; neither machine needs a public IP or an open port on the router. Install the RockDesk app on both computers first ([download](https://rockdesk.io/#download)).

**中文：** 让 Claude Code、Codex、DeepSeek、Trae 等 AI agent 控制另一台电脑：跑命令、读写文件、挂目录、截屏、动鼠标、打字，Windows / macOS / Linux / 安卓都行。按 9 位 RockDesk ID 连，两台都不需要公网 IP、不用在路由器上开端口；两台都先装好 RockDesk（[下载](https://rockdesk.cn/#download)）。MCP 服务器也发在 npm 和 PyPI（`npx -y rockdesk-mcp` / `uvx rockdesk-mcp`），详见下方「中文」。 完整中文说明：[README.zh.md](README.zh.md)。

[![Listed on mcpservers.org](https://mcpservers.org/badge.svg)](https://mcpservers.org/servers/rockdesk-io/rockdesk-skill) [![Official MCP Registry](https://img.shields.io/badge/MCP%20Registry-io.rockdesk%2Frockdesk-2563eb)](https://rockdesk.io/ai-agents.html) [![Open VSX](https://img.shields.io/badge/Open%20VSX-rockdesk.rockdesk-0f766e)](https://open-vsx.org/extension/rockdesk/rockdesk) [![Homebrew Cask](https://img.shields.io/badge/Homebrew-rockdesk--io%2Ftap-d97706)](https://github.com/rockdesk-io/homebrew-tap)

```
npx -y rockdesk-mcp                          # MCP server (stdio) for any MCP client
npx skills add rockdesk-io/rockdesk-skill    # or install it as an agent skill
```

**Needs the RockDesk app on both machines** — the MCP server and the skill only give your agent the commands; RockDesk does the work. [Download RockDesk](https://rockdesk.io/#download) (in China: [rockdesk.cn](https://rockdesk.cn/#download)).

Let your AI agent work on your **other** computers.

[RockDesk](https://rockdesk.io) gives every machine a 9-digit ID and connects them peer-to-peer, falling back to a relay when a direct path isn't possible. No public IP, nothing to open on your router, no server to set up and no sshd on the remote; port forwarding and VPN are built in. Its command line, `rds`, lets an agent:

- run commands on the other machine and get real exit codes (`shell -c`), or start long jobs that outlive the call
- copy, sync and send files, or mount a remote folder as a local one
- take screenshots it can read, then click, type and press keys
- read and set the clipboard, browse clipboard history
- forward TCP ports, serial ports and USB devices, or bring up a VPN into the remote's network

This repository holds the skill that teaches agents to use it, and the source of the **rockdesk-mcp** MCP server (Node.js in [`mcp/npm`](mcp/npm), Python in [`mcp/pypi`](mcp/pypi)), published on npm and PyPI and listed as `io.rockdesk/rockdesk` in the official MCP Registry. See [MCP server](#mcp-server).

Demo: [Claude Code drives a Windows PC](https://youtu.be/VIFOqMNGUW8) · [Claude Code drives a Mac](https://youtu.be/uddhlpvHFV0)

## Quickstart by AI Agent / Client

| Agent / Client | Recommended Install |
|---|---|
| **Claude Code** | `claude mcp add -s user rockdesk -- rds mcp` or `/plugin install rockdesk --marketplace rockdesk-io/rockdesk-skill` |
| **OpenAI Codex CLI** | `codex mcp add rockdesk -- rds mcp` or `codex plugin marketplace add rockdesk-io/rockdesk-skill` |
| **Gemini CLI** | `gemini extensions install https://github.com/rockdesk-io/rockdesk-skill` |
| **DeepSeek Harness (`dsh`)** | `dsh plugin --profile <profile> add github:rockdesk-io/rockdesk-skill` |
| **TRAE / Cursor / Windsurf / Qwen** | `npx skills add rockdesk-io/rockdesk-skill` or stdio MCP `{"command": "rds", "args": ["mcp"]}` |
| **WorkBuddy** | Search **RockDesk** in WorkBuddy Open Platform or install via `npx skills add rockdesk-io/rockdesk-skill` |

## Guides & Benchmarks

- [Mac mini Remote Control & Bidirectional AI Hub](https://rockdesk.io/mac-mini-remote.html) — connect into your always-on Mac mini AND let Claude Code / Codex on it operate your Windows PC, Linux servers, laptops, and Android phones via `rds mcp`.
- [1-RTT P2P FUSE Directory Mount vs SSHFS](https://rockdesk.io/vs-sshfs.html) — measured 4.8× faster small-file writes, 2.9× faster reads, and 35× faster `stat()` at 60 ms RTT.
- [Remote Serial (`/dev/ttyUSB`), USB/IP, Headless ARM64 & ESP32-S3](https://rockdesk.io/remote-serial-usb.html) — remote hardware labs, Wake-on-LAN, GPIO, and physical touchscreen `ask` approval.
- [RockDesk vs AnyDesk](https://rockdesk.io/vs-anydesk.html) · [RockDesk vs RustDesk](https://rockdesk.io/vs-rustdesk.html)

## Install

### 1. Install RockDesk on both machines

[Download](https://rockdesk.io/#download) for Windows, macOS, Linux (x86_64 / arm64) and Android, plus an iOS client; in China use [rockdesk.cn](https://rockdesk.cn/#download). Install it on this computer and on every computer you want your agent to work on, and note the 9-digit ID the app shows there. New devices start with a free trial. On a Linux machine without a screen: `sudo systemctl enable --now rockd`, then `sudo rds otp` for a one-time password.

Direct links that always point to the newest release: [Windows](https://rockdesk.io/download/latest/windows) · [macOS, Apple silicon](https://rockdesk.io/download/latest/macos) · [macOS, Intel](https://rockdesk.io/download/latest/macos-x86_64) · [Linux x86_64 .deb](https://rockdesk.io/download/latest/linux-amd64) · [Linux arm64 .deb](https://rockdesk.io/download/latest/linux-arm64) · [Android .apk](https://rockdesk.io/download/latest/android). In China, use rockdesk.cn instead of rockdesk.io in these links. On macOS (Homebrew): `brew tap rockdesk-io/tap && brew install --cask rockdesk` ([homebrew-tap](https://github.com/rockdesk-io/homebrew-tap)). On Linux: `curl -fL -o rockdesk.deb https://rockdesk.io/download/latest/linux-amd64 && sudo apt install ./rockdesk.deb`.

### 2. Connect your agent: MCP server or skill

**As an MCP server**, for any MCP client. `rds mcp` (RockDesk 1.0.3 and later) is an MCP server over stdio with 18 tools: shell, spawn, copy, ls, screenshot, click, type_text, key, scroll, clipboard, port forwarding and more; screenshots come back as images.

```
claude mcp add -s user rockdesk -- rds mcp      # Claude Code
codex mcp add rockdesk -- rds mcp               # Codex
```

Gemini CLI, Cursor, Claude Desktop, TRAE, Windsurf and other MCP clients take this standard config. It works on macOS, Windows and Linux: `rockdesk-mcp` finds the installed RockDesk by itself. It needs Node.js; with uv, `uvx rockdesk-mcp` works too. If RockDesk is not installed on this computer yet, it serves an `install_rockdesk` tool instead: the agent asks you first, then downloads the official package, installs it and loads the RockDesk tools.

```json
{
  "mcpServers": {
    "rockdesk": {
      "command": "npx",
      "args": ["-y", "rockdesk-mcp"]
    }
  }
}
```

Or point the client at RockDesk itself (no Node.js needed): `{"command": "rds", "args": ["mcp"]}`. On macOS and Windows `rds` is not on the PATH: use `/Applications/rockd.app/Contents/MacOS/rds` or `C:\Program Files\rockd\rds.exe`.

**Or as a skill**, for any agent, with the skills CLI (puts it in `~/.agents/skills` and links it to the agents you pick):

```
npx skills add rockdesk-io/rockdesk-skill
```

**Claude Code, as a plugin** (2.1.275 or later, one step):

```
/plugin install rockdesk --marketplace rockdesk-io/rockdesk-skill
```

Older versions: `/plugin marketplace add rockdesk-io/rockdesk-skill`, then `/plugin install rockdesk@rockdesk`.
The plugin lives in [`plugins/rockdesk/`](plugins/rockdesk/): Claude's plugin directory accepts only Markdown, text, JSON
and images in a plugin folder, so it is kept apart from the files for other agents. Its copy of the skill is the same
as [`skills/rockd-remote-control/SKILL.md`](skills/rockd-remote-control/SKILL.md) except that it points to the install
guide instead of a one-line Linux install, and lets the user type passwords into `rds <id> auth` themselves.

**Gemini CLI, as an extension:**

```
gemini extensions install https://github.com/rockdesk-io/rockdesk-skill
```

**DeepSeek Harness (dsh), as a plugin:** install it into the profile you use, then restart that profile:

```
dsh plugin --profile <profile> add github:rockdesk-io/rockdesk-skill
```

**Or just ask your agent** (Claude Code, Codex, DeepSeek Harness, …):

```
Install the skill at https://rockdesk.io/rockdesk-cli.md
```

**Codex, as a plugin:**

```
codex plugin marketplace add rockdesk-io/rockdesk-skill
codex plugin add rockdesk@rockdesk
```

**Codex, skill only:** run this inside Codex, then restart it:

```
$skill-installer install https://github.com/rockdesk-io/rockdesk-skill/tree/main/skills/rockd-remote-control
```

**Or by hand:** copy `skills/rockd-remote-control/` into `~/.claude/skills/` (Claude Code), `~/.gemini/skills/` (Gemini CLI) or `~/.agents/skills/` (Codex, DeepSeek Harness — dsh does not read `~/.claude/skills`).

If RockDesk isn't installed yet, the skill tells your agent to point you to the download page (or offer to install it for you).

## MCP server

The source of `rockdesk-mcp` is in this repository: [`mcp/npm/bin/rockdesk-mcp.js`](mcp/npm/bin/rockdesk-mcp.js) (npm) and [`mcp/pypi/src/rockdesk_mcp`](mcp/pypi/src/rockdesk_mcp) (PyPI). It is a stdio MCP server:

- With RockDesk installed, it serves RockDesk's 18 tools (`status`, `devices`, `ping`, `shell`, `spawn`, `ls`, `copy`, `info`, `screenshot`, `click`, `move`, `scroll`, `type_text`, `key`, `clipboard_get`, `clipboard_set`, `forward`, `unforward`) through the engine built into the RockDesk app (`rds mcp`), which makes the peer-to-peer connections.
- Without RockDesk, it serves `rockdesk_status` and `install_rockdesk`, and the agent asks you before installing RockDesk.

Run it from source with `node mcp/npm/bin/rockdesk-mcp.js` or `PYTHONPATH=mcp/pypi/src python3 -m rockdesk_mcp`. The [Dockerfile](Dockerfile) builds it together with RockDesk for Linux, so an MCP directory can start it and list the tools.

## Things to ask

- "123 456 789 is my office PC. How much space is left on C:, and how long has it been up?"
- "On that Mac, open a Chrome guest window, fill in this form and copy what the server sends back here as order.json."
- "Tail the service log on the robot computer and restart the service if it's stuck."
- "Copy notes.txt to its desktop and open it."

## How it works

`rds` never touches the network itself. It hands each command to the local RockDesk background service, which keeps one end-to-end encrypted connection per peer (QUIC, TLS 1.3) and reuses it for every later command: direct when NAT traversal works, through a relay otherwise. The relay only sees ciphertext.

The machine being controlled decides who gets in: click to allow, a one-time password, a fixed password, or a key pair shared across your own devices. Your agent can only do what that machine allows.

## Data handling

- Commands, files, screenshots and keystrokes go between your own machines over an end-to-end encrypted connection (QUIC, TLS 1.3). When there is no direct path they pass through a RockDesk relay, which only forwards ciphertext and stores nothing.
- The RockDesk server sees what it needs to connect devices and check licenses: device IDs, network addresses, and your account email if you log in. It does not see session content.
- The skill itself only runs the local `rds` command. It sends nothing to Anthropic or any other third party.

## Pricing

Each device gets a 10-day free trial. After that see [pricing](https://rockdesk.io/pricing.html).

## License

Everything in this repository is MIT-licensed ([LICENSE](LICENSE)): the skill, the source of the rockdesk-mcp MCP server in `mcp/`, the plugin manifests and this README. The license does not cover the RockDesk software itself: RockDesk is proprietary and is used under the [RockDesk Terms](https://rockdesk.io/terms.html).

## 中文

**先在两台电脑上装好 RockDesk**（下载：[rockdesk.cn](https://rockdesk.cn/#download)）：skill 只是教 AI 怎么用命令，真正干活的是 RockDesk。

RockDesk 让 Claude Code、Codex、DeepSeek Harness 这些 AI 直接操作你的另一台电脑：跑命令、传文件、截屏、点鼠标、敲键盘，按 ID 点对点连接，不用开端口、不用配 VPN。

安装 skill：在 Claude Code 里输入 `/plugin marketplace add rockdesk-io/rockdesk-skill` 和 `/plugin install rockdesk@rockdesk`，或者直接跟 AI 说「安装 https://rockdesk.io/rockdesk-cli.md 这个 skill」；Codex 用 `codex plugin marketplace add rockdesk-io/rockdesk-skill` 和 `codex plugin add rockdesk@rockdesk` 装成插件（或者上面那条 `$skill-installer` 命令）；Gemini CLI 用 `gemini extensions install https://github.com/rockdesk-io/rockdesk-skill` 装成扩展；DeepSeek Harness（dsh）用 `dsh plugin --profile <你的 profile> add github:rockdesk-io/rockdesk-skill` 装成插件，或者把 `skills/rockd-remote-control/` 拷到 `~/.agents/skills/`（dsh 不读 `~/.claude/skills`）；也可以用 `npx skills add rockdesk-io/rockdesk-skill` 一条命令装好。不想装 skill 也行，直接接 MCP：`claude mcp add -s user rockdesk -- rds mcp`（Codex 是 `codex mcp add rockdesk -- rds mcp`），skill 和 MCP 爱用哪个用哪个。两台电脑都要装 RockDesk，国内从 [rockdesk.cn](https://rockdesk.cn/#download) 下载；固定的最新版直链是 `https://rockdesk.cn/download/latest/<平台>`，平台写 windows、macos、macos-x86_64、linux-amd64、linux-arm64 或 android。

- **专题文档与实测**：[AI 远程控制总览](https://rockdesk.cn/ai-agents.html) · [Mac mini 双向 AI 中控指南](https://rockdesk.cn/mac-mini-remote.html) · [1-RTT 目录挂载对比 SSHFS（快 4.8–35 倍）](https://rockdesk.cn/vs-sshfs.html) · [远程串口 / USB / ARM64 / ESP32-S3](https://rockdesk.cn/remote-serial-usb.html)
- **macOS Homebrew 一行安装**：`brew tap rockdesk-io/tap && brew install --cask rockdesk`；TRAE / WorkBuddy / 千问等支持 Skill 或标准 stdio MCP 的客户端均可直接通过 `npx skills add rockdesk-io/rockdesk-skill` 或 `rds mcp` 接入。

本仓库里还有 MCP 服务 rockdesk-mcp 的源码（[mcp/npm](mcp/npm)、[mcp/pypi](mcp/pypi)，MIT 许可），也就是官方 MCP 目录里的 `io.rockdesk/rockdesk`：装了 RockDesk 时提供 18 个工具，没装时提供 `rockdesk_status`、`install_rockdesk`（装之前先问你）。

### 常见问题

**AI 怎么远程控制另一台电脑？**
两台电脑都装 RockDesk，在本机的 AI 工具里接上 RockDesk（skill 或 MCP），然后直接用中文说，比如「连上 123456789，看看磁盘还剩多少，把 /var/log 里最近的错误整理给我」。AI 通过 RockDesk 的 `rds` 命令在那台电脑上跑命令、传文件、截屏、点鼠标、打字。两台电脑在不同网络、都没有公网 IP 也能连。

**DeepSeek 能远程控制电脑吗？DeepSeek Harness 有控制远程电脑的插件吗？**
能。DeepSeek Harness（dsh）装上 RockDesk 插件，就能按 ID 操作远程电脑：`dsh plugin --profile <你的 profile> add github:rockdesk-io/rockdesk-skill`（npm 包名 `dsh-plugin-rockdesk`）。

**Claude Code、Codex 怎么远程控制服务器，不想配 SSH？**
Claude Code：`claude mcp add -s user rockdesk -- rds mcp`；Codex：`codex mcp add rockdesk -- rds mcp`。服务器上装 RockDesk 就行（也支持没有桌面的 Linux 服务器），不用 sshd、不用开端口。

**有没有远程桌面的 MCP 服务器？**
`rds mcp` 是标准 stdio MCP 服务，18 个工具：shell、spawn、ls、copy、screenshot、click、move、scroll、type_text、key、clipboard_get、clipboard_set、forward 等。也可以用 `npx -y rockdesk-mcp`（npm）或 `uvx rockdesk-mcp`（PyPI）启动，它们会调用本机装好的 RockDesk。官方 MCP Registry 里的名字是 `io.rockdesk/rockdesk`。

**没有公网 IP，怎么远程桌面连回家里电脑？**
RockDesk 按 9 位 ID 连接：能打洞就点对点直连，打不通自动走中继，内容端到端加密（QUIC / TLS 1.3），不用内网穿透、不用自己搭服务器。

**Mac mini 放家里，怎么远程控制？**
Mac mini 上装 RockDesk，在外面用电脑或安卓手机输它的 ID 就能连：看桌面、开终端、传文件；它上面的 Claude Code / Codex 也能反过来操作你的其它电脑。见 [Mac mini 远程控制指南](https://rockdesk.cn/mac-mini-remote.html)。

**手机能远程控制电脑吗？**
安卓版 RockDesk 可以当遥控端，打开电脑的桌面或终端。

**怎么远程调试另一台电脑上的串口、USB 设备？**
`rds 123456789 serial /dev/ttyUSB0 115200` 把远程串口接成本机的虚拟串口（本机这头是 Linux 或 macOS）；`rds 123456789 usb attach <busid>` 把远程 USB 设备接到本机（USB 转发支持 Linux 和 Windows）。见 [远程串口 / USB 调试指南](https://rockdesk.cn/remote-serial-usb.html)。
