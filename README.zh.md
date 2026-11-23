# RockDesk（磐石远控）远程控制电脑插件：让 DeepSeek Harness、Claude Code、Codex、Gemini CLI 按 ID 操作另一台电脑

[English](README.md)

RockDesk 给每台电脑一个 9 位 ID，按 ID 点对点连接（打不通时自动走中继，内容端到端加密）。装上这个 skill / 插件 / MCP 服务器后，你本机的 AI 就能按 ID 在另一台电脑上：

- 跑命令，拿到真实退出码；或者起一个比这次调用活得长的后台任务
- 传文件、同步目录，或者把远程目录挂成本地文件夹
- 截屏给 AI 看，再点鼠标、打字、按快捷键
- 读写剪贴板、翻剪贴板历史
- 转发 TCP 端口、串口、USB 设备，或者开内网穿透进入对方的局域网

两台电脑都不需要公网 IP，不用开端口，不用配 VPN 或 SSH。

**先在两台电脑上都装好 RockDesk**（下载：[rockdesk.cn](https://rockdesk.cn/#download)）：Windows、macOS（Apple 芯片和 Intel）、Linux（x86_64 和 arm64，也支持没有桌面的服务器）、安卓。这个仓库里的 skill 只是教 AI 怎么用命令，真正干活的是 RockDesk。

## 各 AI 工具怎么接入

| AI 工具 | 接入命令 |
|---|---|
| DeepSeek Harness（dsh） | `dsh plugin --profile <你的 profile> add github:rockdesk-io/rockdesk-skill`（npm 包名 `dsh-plugin-rockdesk`） |
| Claude Code | `claude mcp add -s user rockdesk -- rds mcp`，或 `/plugin install rockdesk --marketplace rockdesk-io/rockdesk-skill` |
| Codex | `codex mcp add rockdesk -- rds mcp`，或 `codex plugin marketplace add rockdesk-io/rockdesk-skill` |
| Gemini CLI | `gemini extensions install https://github.com/rockdesk-io/rockdesk-skill` |
| Trae、Cursor、Windsurf、千问、WorkBuddy 等 | `npx skills add rockdesk-io/rockdesk-skill`，或标准 stdio MCP：`{"command": "rds", "args": ["mcp"]}` |
| 只要 MCP 服务器 | `npx -y rockdesk-mcp`（npm）或 `uvx rockdesk-mcp`（PyPI），它们会调用本机装好的 RockDesk |

Cursor、Claude Desktop、Trae、Windsurf 等用 JSON 配置 MCP 的客户端，填下面这段就行，macOS、Windows、Linux 通用：`rockdesk-mcp` 会自己找到本机装好的 RockDesk。需要装 Node.js；装了 uv 的也可以用 `uvx rockdesk-mcp`。

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

接好以后直接用中文说，例如：

- 「连上 123456789，看看磁盘还剩多少，把 /var/log 里最近的错误整理给我。」
- 「把 987654321 上的 /srv/app 挂到本地，修好配置后在那台上跑一遍测试。」
- 「截一张 123456789 的屏幕，点开设置页确认版本号。」

## AI 在远程电脑上能做什么

`rds mcp` 是标准的 stdio MCP 服务，提供 18 个工具：

| 类别 | 工具 |
|---|---|
| 设备 | status、devices、ping |
| 命令 | shell（带真实退出码）、spawn（后台长任务） |
| 文件 | ls、copy |
| 屏幕与键鼠 | info、screenshot、click、move、scroll、type_text、key |
| 剪贴板 | clipboard_get、clipboard_set |
| 端口 | forward、unforward |

命令行 `rds` 还能（skill 方式可用）：把远程目录挂成本地文件夹（mount）、整目录同步（sync）、串口转发（serial）、USB 设备转发（usb，Linux 和 Windows）、内网穿透（vpn）。

## 安全：被控的那台说了算

- 谁能连进来由被控的那台决定：点「允许」、一次性密码、固定密码，或者你自己几台设备共用的密钥。
- 终端、文件、桌面、剪贴板、端口转发、串口、USB 可以分别开关，给 AI 只开需要的。
- 连接端到端加密（QUIC / TLS 1.3）；没有直连路径时经中继转发，中继只转发密文、不存内容。
- 这个 skill 只调用本机的 `rds` 命令，不往任何第三方发数据。

## 常见问题

**AI 怎么远程控制另一台电脑？**
两台电脑都装 RockDesk，在本机的 AI 工具里接上 RockDesk（skill 或 MCP），然后直接用中文说要做什么。AI 通过 RockDesk 的 `rds` 命令在那台电脑上跑命令、传文件、截屏、点鼠标、打字。两台电脑在不同网络、都没有公网 IP 也能连。

**DeepSeek 能远程控制电脑吗？DeepSeek Harness 有控制远程电脑的插件吗？**
能。DeepSeek Harness 装上 RockDesk 插件，就能按 ID 操作远程电脑：`dsh plugin --profile <你的 profile> add github:rockdesk-io/rockdesk-skill`（npm 包名 `dsh-plugin-rockdesk`）。

**Claude Code、Codex 怎么远程控制服务器，不想配 SSH？**
Claude Code：`claude mcp add -s user rockdesk -- rds mcp`；Codex：`codex mcp add rockdesk -- rds mcp`。服务器上装 RockDesk 就行（也支持没有桌面的 Linux 服务器），不用 sshd、不用开端口。

**有没有远程桌面的 MCP 服务器？**
`rds mcp` 就是，18 个工具见上表。也可以用 `npx -y rockdesk-mcp` 或 `uvx rockdesk-mcp` 启动。官方 MCP Registry 里的名字是 `io.rockdesk/rockdesk`。

**没有公网 IP，怎么远程桌面连回家里电脑？**
RockDesk 按 9 位 ID 连接：能打洞就点对点直连，打不通自动走中继，内容端到端加密，不用内网穿透、不用自己搭服务器。

**Mac mini 放家里，怎么远程控制？**
Mac mini 上装 RockDesk，在外面用电脑或安卓手机输它的 ID 就能连：看桌面、开终端、传文件；它上面的 Claude Code / Codex 也能反过来操作你的其它电脑。见 [Mac mini 远程控制指南](https://rockdesk.cn/mac-mini-remote.html)。

**手机能远程控制电脑吗？**
安卓版 RockDesk 可以当遥控端，打开电脑的桌面或终端。

**怎么远程调试另一台电脑上的串口、USB 设备？**
`rds 123456789 serial /dev/ttyUSB0 115200` 把远程串口接成本机的虚拟串口（本机这头是 Linux 或 macOS）；`rds 123456789 usb attach <busid>` 把远程 USB 设备接到本机（USB 转发支持 Linux 和 Windows）。见 [远程串口 / USB 调试指南](https://rockdesk.cn/remote-serial-usb.html)。

## 价格

每台新设备有 10 天免费试用，之后见 [价格页](https://rockdesk.cn/pricing.html)。

## 许可

本仓库里的 skill 文件、插件清单和 README 采用 MIT 许可（[LICENSE](LICENSE)）；RockDesk 本身是专有软件。
