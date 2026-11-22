# rockdesk-mcp：让 AI 按 ID 远程控制另一台电脑

**rockdesk-mcp** starts the MCP server built into **RockDesk（磐石远控）**, so AI agents can control your other computers by a 9-digit ID. English below.

## 中文

装好以后，Claude Code、Codex、Gemini CLI、DeepSeek Harness、Cursor、Trae 等 AI 工具就能按 9 位 ID **控制远程电脑**：跑命令（带真实退出码）、传文件、截屏、点鼠标、打字、读写剪贴板、转发端口。两台电脑点对点连接，都不需要公网 IP，不用开端口，内容端到端加密；打不通直连时自动经中继。

### 第 1 步：两台电脑都装 RockDesk

下载：<https://rockdesk.cn/#download>（海外：<https://rockdesk.io/#download>）。支持 Windows、macOS、Linux（x86_64 / arm64，也支持没有桌面的服务器）和安卓。装好打开一次，每台会显示自己的 9 位 ID。

### 第 2 步：接到你的 AI 工具

| AI 工具 | 接入方式 |
|---|---|
| Claude Code | `claude mcp add -s user rockdesk -- npx -y rockdesk-mcp` |
| Codex | `codex mcp add rockdesk -- npx -y rockdesk-mcp` |
| Cursor、Trae、Gemini CLI、Claude Desktop 等 | 在 MCP 配置里加：`{"mcpServers": {"rockdesk": {"command": "npx", "args": ["-y", "rockdesk-mcp"]}}}` |
| DeepSeek Harness | 用 RockDesk 的 DSH 插件：`dsh plugin --profile <你的 profile> add github:rockdesk-io/rockdesk-skill` |

电脑上已经能直接运行 `rds` 的，也可以不用这个包，直接写 `rds mcp`；这个包只是帮你找到 RockDesk 自带的 `rds`（macOS 上在 `/Applications/rockd.app/Contents/MacOS/rds`，Windows 上在 `C:\Program Files\rockd\rds.exe`）。

### 第 3 步：直接用中文说

- 「列出我的设备，连上 123456789，看看磁盘还剩多少，把最近的错误日志整理给我。」
- 「在 987654321 上拉最新代码跑测试，失败的话截一张屏幕给我。」
- 「把 123456789 的 8080 端口转发到本机。」

### AI 能用的 18 个工具

| 类别 | 工具 |
|---|---|
| 设备 | `status`、`devices`、`ping` |
| 命令 | `shell`（带真实退出码）、`spawn`（后台长任务） |
| 文件 | `ls`、`copy` |
| 屏幕与键鼠 | `info`、`screenshot`、`click`、`move`、`scroll`、`type_text`、`key` |
| 剪贴板 | `clipboard_get`、`clipboard_set` |
| 端口 | `forward`、`unforward` |

挂载远程目录、串口转发、USB 转发、内网穿透这些能力在 RockDesk 的命令行 `rds` 和 skill 里：<https://rockdesk.cn/ai-agents.html>。

### 安全：被控的那台说了算

- 只有同一账号下的设备、知道固定密码的人，或者被控那台点了「允许」的，才能连进来。
- 终端、文件、桌面、剪贴板、端口转发等功能分别开关，按需给 AI 最小权限。

### 价格

每台新设备有免费试用期，价格见 <https://rockdesk.cn/pricing.html>。

## English

With this server, AI agents (Claude Code, Codex, Gemini CLI, DeepSeek Harness, Cursor, Trae, Claude Desktop and others) can **control your other computers** by their 9-digit RockDesk ID: run shell commands with real exit codes, copy files, take screenshots, click, type, use the clipboard and forward ports — on Windows, macOS, Linux (x86_64 / arm64, including headless servers) and Android. Peer to peer and end-to-end encrypted; neither machine needs a public IP or an open port, and a relay takes over when a direct path is not possible.

1. **Install RockDesk on both machines:** <https://rockdesk.io/#download>. Open it once to see each machine's 9-digit ID.
2. **Add the server to your agent:**
   - Claude Code: `claude mcp add -s user rockdesk -- npx -y rockdesk-mcp`
   - Codex: `codex mcp add rockdesk -- npx -y rockdesk-mcp`
   - Any MCP client (Cursor, Trae, Gemini CLI, Claude Desktop…): `{"mcpServers": {"rockdesk": {"command": "npx", "args": ["-y", "rockdesk-mcp"]}}}`
   - DeepSeek Harness: `dsh plugin --profile <profile> add github:rockdesk-io/rockdesk-skill`
3. **Ask in plain language:** "List my devices, connect to 123456789 and check its free disk space."

The machine being connected to decides who gets in (same account, its fixed password, or a click on Allow) and which features they may use. Each new device starts with a free trial; pricing: <https://rockdesk.io/pricing.html>. More: <https://rockdesk.io/ai-agents.html>.

License: MIT (this launcher). RockDesk itself is a separate download.
