# RockDesk skill for Claude Code, Codex and other agents

Let your AI agent work on your **other** computers.

[RockDesk](https://rockdesk.io) gives every machine a 9-digit ID and connects them peer-to-peer, falling back to a relay when a direct path isn't possible. No port forwarding, no VPN setup, no sshd on the remote. Its command line, `rds`, lets an agent:

- run commands on the other machine and get real exit codes (`shell -c`), or start long jobs that outlive the call
- copy, sync and send files, or mount a remote folder as a local one
- take screenshots it can read, then click, type and press keys
- read and set the clipboard, browse clipboard history
- forward TCP ports, serial ports and USB devices, or bring up a VPN into the remote's network

This repository holds the skill that teaches agents to use it.

Demo: [Claude Code drives a Windows PC](https://youtu.be/VIFOqMNGUW8) · [Claude Code drives a Mac](https://youtu.be/uddhlpvHFV0)

## Install

**Claude Code, as a plugin:**

```
/plugin marketplace add rockdesk-io/rockdesk-skill
/plugin install rockdesk@rockdesk
```

**Or just ask your agent** (Claude Code, Codex, …):

```
Install the skill at https://rockdesk.io/rockdesk-cli.md
```

**Codex:** run this inside Codex, then restart it:

```
$skill-installer install https://github.com/rockdesk-io/rockdesk-skill/tree/main/skills/rockd-remote-control
```

**Or by hand:** copy `skills/rockd-remote-control/` into `~/.claude/skills/` (Claude Code) or `~/.agents/skills/` (Codex).

You also need RockDesk on both machines: [download](https://rockdesk.io/#download) for Windows, macOS, Linux (x86_64 / arm64) and Android, plus an iOS client. In China use [rockdesk.cn](https://rockdesk.cn/#download).

## Things to ask

- "123 456 789 is my office PC. How much space is left on C:, and how long has it been up?"
- "On that Mac, open a Chrome guest window, fill in this form and copy what the server sends back here as order.json."
- "Tail the service log on the robot computer and restart the service if it's stuck."
- "Copy notes.txt to its desktop and open it."

## How it works

`rds` never touches the network itself. It hands each command to the local RockDesk background service, which keeps one end-to-end encrypted connection per peer (QUIC, TLS 1.3) and reuses it for every later command: direct when NAT traversal works, through a relay otherwise. The relay only sees ciphertext.

The machine being controlled decides who gets in: click to allow, a one-time password, a fixed password, or a key pair shared across your own devices. Your agent can only do what that machine allows.

## Pricing

Each device gets a 10-day free trial. After that see [pricing](https://rockdesk.io/pricing.html).

## License

The skill file, plugin manifests and README in this repository are MIT-licensed ([LICENSE](LICENSE)). RockDesk itself is proprietary software.

## 中文

RockDesk 让 Claude Code、Codex 这些 AI 直接操作你的另一台电脑：跑命令、传文件、截屏、点鼠标、敲键盘，按 ID 点对点连接，不用开端口、不用配 VPN。

安装 skill：在 Claude Code 里输入 `/plugin marketplace add rockdesk-io/rockdesk-skill` 和 `/plugin install rockdesk@rockdesk`，或者直接跟 AI 说「安装 https://rockdesk.io/rockdesk-cli.md 这个 skill」；Codex 用上面那条 `$skill-installer` 命令。两台电脑都要装 RockDesk，国内从 [rockdesk.cn](https://rockdesk.cn/#download) 下载。
