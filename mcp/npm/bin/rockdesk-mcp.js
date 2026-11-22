#!/usr/bin/env node
// rockdesk-mcp: starts RockDesk's built-in MCP server (`rds mcp`, stdio).
// RockDesk itself must be installed: https://rockdesk.io/#download (China: https://rockdesk.cn/#download)
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const isWin = process.platform === 'win32';
const exe = isWin ? 'rds.exe' : 'rds';

// The old RockDesk app also ships an `rds`, as a two-line shell script; RockDesk's current `rds` is a native binary.
function isNativeRds(p) {
  try {
    const st = fs.statSync(p);
    if (!st.isFile()) return false;
    const fd = fs.openSync(p, 'r');
    const b = Buffer.alloc(2);
    fs.readSync(fd, b, 0, 2, 0);
    fs.closeSync(fd);
    return b.toString('latin1') !== '#!';
  } catch (e) {
    return false;
  }
}

function candidates() {
  const c = [];
  if (process.env.RDS) c.push(process.env.RDS);
  if (process.platform === 'darwin') {
    c.push('/Applications/rockd.app/Contents/MacOS/rds');
    c.push(path.join(process.env.HOME || '', 'Applications/rockd.app/Contents/MacOS/rds'));
    c.push('/opt/homebrew/bin/rds', '/usr/local/bin/rds');
  } else if (isWin) {
    for (const v of ['ProgramFiles', 'ProgramW6432', 'ProgramFiles(x86)']) {
      if (process.env[v]) c.push(path.join(process.env[v], 'rockd', 'rds.exe'));
    }
  } else {
    c.push('/usr/bin/rds', '/usr/local/bin/rds');
  }
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    if (dir) c.push(path.join(dir, exe));
  }
  return c;
}

const rds = candidates().find(isNativeRds);
if (!rds) {
  process.stderr.write(
    'rockdesk-mcp: RockDesk is not installed on this computer (its `rds` command was not found).\n' +
    '  Install RockDesk from https://rockdesk.io/#download (China: https://rockdesk.cn/#download),\n' +
    '  open it once, then restart your AI tool. To point at a custom location, set RDS=/path/to/rds.\n' +
    'rockdesk-mcp：这台电脑还没装 RockDesk（找不到它的 rds 命令）。请到 https://rockdesk.cn/#download 下载安装、打开一次，再重启 AI 工具。\n');
  process.exit(1);
}

const child = spawn(rds, ['mcp', ...process.argv.slice(2)], { stdio: 'inherit' });
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, () => { try { child.kill(sig); } catch (e) { /* already gone */ } });
}
child.on('error', (e) => {
  process.stderr.write(`rockdesk-mcp: could not start ${rds}: ${e.message}\n`);
  process.exit(1);
});
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code === null ? 1 : code);
});
