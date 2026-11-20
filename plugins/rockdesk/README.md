# RockDesk plugin for Claude Code

Lets Claude Code work on your other computers through RockDesk's `rds` command
line: a shell with real exit codes, files (copy, sync, mount), screenshots,
mouse and keyboard, clipboard, and port / serial / USB forwarding. Machines are
reached peer-to-peer by their 9-digit RockDesk ID, with no open ports.

## Install RockDesk first

This plugin only teaches Claude Code how to use RockDesk; the RockDesk app does
the work. Install it on this computer and on every computer Claude Code should
operate:

- Download: https://rockdesk.io/#download (in China: https://rockdesk.cn/#download)
- Install steps: https://rockdesk.io/quickstart.html

## Install the plugin

In Claude Code 2.1.275 or later:

```
/plugin install rockdesk --marketplace rockdesk-io/rockdesk-skill
```

Then give Claude Code the 9-digit ID of the machine you want it to work on. The
machine being controlled decides who may connect and what they may use.

## More

- Repository, other agents (Codex, Gemini CLI, DeepSeek Harness) and the MCP
  server: https://github.com/rockdesk-io/rockdesk-skill
- Support: https://rockdesk.io/support.html · Privacy: https://rockdesk.io/privacy.html

The files of this plugin are MIT-licensed (see LICENSE). The RockDesk app itself
is proprietary software.
