# RockDesk skill for Claude Code, Codex, Gemini CLI, DeepSeek Harness and other agents

```
npx skills add rockdesk-io/rockdesk-skill
```

**Needs the RockDesk app on both machines** — the skill only teaches your agent the commands; RockDesk does the work. [Download RockDesk](https://rockdesk.io/#download) (in China: [rockdesk.cn](https://rockdesk.cn/#download)).

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

### 1. Install RockDesk on both machines

[Download](https://rockdesk.io/#download) for Windows, macOS, Linux (x86_64 / arm64) and Android, plus an iOS client; in China use [rockdesk.cn](https://rockdesk.cn/#download). Install it on this computer and on every computer you want your agent to work on, and note the 9-digit ID the app shows there. New devices start with a free trial. On a Linux machine without a screen: `sudo systemctl enable --now rockd`, then `sudo rds otp` for a one-time password.

### 2. Install the skill in your agent

**Any agent, with the skills CLI** (puts it in `~/.agents/skills` and links it to the agents you pick):

```
npx skills add rockdesk-io/rockdesk-skill
```

**Claude Code, as a plugin:**

```
/plugin marketplace add rockdesk-io/rockdesk-skill
/plugin install rockdesk@rockdesk
```

**DeepSeek Harness (dsh), as a plugin:** install it into the profile you use, then restart that profile:

```
dsh plugin --profile <profile> add github:rockdesk-io/rockdesk-skill
```

**Or just ask your agent** (Claude Code, Codex, DeepSeek Harness, …):

```
Install the skill at https://rockdesk.io/rockdesk-cli.md
```

**Codex:** run this inside Codex, then restart it:

```
$skill-installer install https://github.com/rockdesk-io/rockdesk-skill/tree/main/skills/rockd-remote-control
```

**Or by hand:** copy `skills/rockd-remote-control/` into `~/.claude/skills/` (Claude Code), `~/.gemini/skills/` (Gemini CLI) or `~/.agents/skills/` (Codex, DeepSeek Harness — dsh does not read `~/.claude/skills`).

If RockDesk isn't installed yet, the skill tells your agent to point you to the download page (or offer to install it for you).

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

The skill file, plugin manifests and README in this repository are MIT-licensed ([LICENSE](LICENSE)). RockDesk itself is proprietary software.

## 中文

**先在两台电脑上装好 RockDesk**（下载：[rockdesk.cn](https://rockdesk.cn/#download)）：skill 只是教 AI 怎么用命令，真正干活的是 RockDesk。

RockDesk 让 Claude Code、Codex、DeepSeek Harness 这些 AI 直接操作你的另一台电脑：跑命令、传文件、截屏、点鼠标、敲键盘，按 ID 点对点连接，不用开端口、不用配 VPN。

安装 skill：在 Claude Code 里输入 `/plugin marketplace add rockdesk-io/rockdesk-skill` 和 `/plugin install rockdesk@rockdesk`，或者直接跟 AI 说「安装 https://rockdesk.io/rockdesk-cli.md 这个 skill」；Codex 用上面那条 `$skill-installer` 命令；DeepSeek Harness（dsh）用 `dsh plugin --profile <你的 profile> add github:rockdesk-io/rockdesk-skill` 装成插件，或者把 `skills/rockd-remote-control/` 拷到 `~/.agents/skills/`（dsh 不读 `~/.claude/skills`）；也可以用 `npx skills add rockdesk-io/rockdesk-skill` 一条命令装好。两台电脑都要装 RockDesk，国内从 [rockdesk.cn](https://rockdesk.cn/#download) 下载。
