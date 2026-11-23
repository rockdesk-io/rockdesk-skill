#!/usr/bin/env node
// rockdesk-mcp: starts RockDesk's built-in MCP server (`rds mcp`, stdio).
// RockDesk has to be installed on this computer and on the one you control: https://rockdesk.io/#download
// (China: https://rockdesk.cn/#download).
//
// If RockDesk is not installed here yet, this runs a small setup MCP server instead, so the agent can tell the user
// what is missing: `rockdesk_status` explains it, and `install_rockdesk` (only with confirm=true, after the user agrees)
// downloads the official installer for this system, installs it, then hands over to `rds mcp` and tells the client
// that the tool list changed.
//
// Environment: RDS=/path/to/rds (custom location); ROCKDESK_DOWNLOAD_BASE=https://rockdesk.cn (download site);
// for testing: ROCKDESK_MCP_ASSUME_MISSING=1 (act as if RockDesk were not installed), ROCKDESK_MCP_DRY_RUN=1
// (download and check the installer, but do not install it).
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const readline = require('readline');
const { spawn, spawnSync } = require('child_process');

const VERSION = (() => { try { return require('../package.json').version; } catch (e) { return '0'; } })();
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
    c.push('/usr/bin/rds', '/usr/local/bin/rds', '/opt/rockd/bin/rds');
  }
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    if (dir) c.push(path.join(dir, exe));
  }
  return c;
}

function findRds() {
  if (process.env.ROCKDESK_MCP_ASSUME_MISSING) return null;
  return candidates().find(isNativeRds) || null;
}

// ---------- RockDesk is installed: run its MCP server ----------

function runRds(rds) {
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
}

// ---------- RockDesk is not installed: setup server ----------

// China: rockdesk.cn (rockdesk.io is behind Cloudflare and slow for big downloads there).
function downloadBase() {
  if (process.env.ROCKDESK_DOWNLOAD_BASE) return process.env.ROCKDESK_DOWNLOAD_BASE.replace(/\/+$/, '');
  let tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* no Intl */ }
  tz = tz || process.env.TZ || '';
  const lang = process.env.LC_ALL || process.env.LANG || '';
  const china = /^(Asia\/(Shanghai|Chongqing|Chungking|Harbin|Urumqi|Kashgar)|PRC)$/.test(tz) || /^zh[_-]CN/i.test(lang);
  return china ? 'https://rockdesk.cn' : 'https://rockdesk.io';
}

// The package for this system: the name used in https://<site>/download/latest/<name>.
function packageName() {
  if (isWin) return { name: 'windows', ext: '.exe' };
  if (process.platform === 'darwin') return { name: process.arch === 'arm64' ? 'macos' : 'macos-x86_64', ext: '.dmg' };
  if (process.platform === 'linux') {
    if (process.arch === 'x64') return { name: 'linux-amd64', ext: '.deb' };
    if (process.arch === 'arm64') return { name: 'linux-arm64', ext: '.deb' };
  }
  return null;
}

function download(url, dest, onProgress, hops = 0) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': `rockdesk-mcp/${VERSION}` } }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        if (hops >= 5) return reject(new Error('too many redirects'));
        return resolve(download(new URL(res.headers.location, url).toString(), dest, onProgress, hops + 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const total = Number(res.headers['content-length']) || 0;
      let got = 0;
      const out = fs.createWriteStream(dest);
      res.on('data', (chunk) => { got += chunk.length; if (onProgress) onProgress(got, total); });
      res.pipe(out);
      out.on('finish', () => out.close(() => {
        if (total && got !== total) return reject(new Error(`download incomplete (${got} of ${total} bytes)`));
        resolve({ url, bytes: got });
      }));
      out.on('error', reject);
      res.on('error', reject);
    });
    req.setTimeout(60000, () => req.destroy(new Error('download stalled for 60 s')));
    req.on('error', reject);
  });
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return { ok: r.status === 0, status: r.status, out: ((r.stdout || '') + (r.stderr || '')).trim(), error: r.error };
}

const has = (cmd) => run('sh', ['-c', `command -v ${cmd}`]).ok;

// Installs the downloaded package; returns notes for the user. Throws with a readable message if it cannot.
function installPackage(file, pkg) {
  const notes = [];
  if (isWin) {
    // Start-Process goes through ShellExecute, so Windows shows the UAC prompt the installer needs. Not -Wait: it also waits
    // for every process the installer started, including the RockDesk app it opens at the end, so it never returns.
    const ps = `$p = Start-Process -FilePath '${file.replace(/'/g, "''")}' -ArgumentList '/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/SP-' -PassThru; $p.WaitForExit(); exit $p.ExitCode`;
    const r = run('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', ps]);
    if (!r.ok) throw new Error(`the installer did not finish (exit ${r.status}${r.out ? ': ' + r.out.slice(-300) : ''}). If a UAC prompt was declined, run it again; or the user can run ${file} themselves.`);
    return notes;
  }
  if (process.platform === 'darwin') {
    const mnt = fs.mkdtempSync(path.join(os.tmpdir(), 'rockdesk-dmg-'));
    const a = run('hdiutil', ['attach', '-nobrowse', '-readonly', '-mountpoint', mnt, file]);
    if (!a.ok) throw new Error(`could not open the disk image: ${a.out.slice(-300)}`);
    try {
      const app = path.join(mnt, 'rockd.app');
      if (!fs.existsSync(app)) throw new Error('rockd.app is not in the disk image');
      let dir = '/Applications';
      try { fs.accessSync(dir, fs.constants.W_OK); } catch (e) { dir = path.join(os.homedir(), 'Applications'); fs.mkdirSync(dir, { recursive: true }); }
      const dest = path.join(dir, 'rockd.app');
      const c = run('ditto', [app, dest]);
      if (!c.ok) throw new Error(`could not copy RockDesk into ${dir}: ${c.out.slice(-300)}`);
      run('open', [dest]);
      notes.push(`RockDesk was copied into ${dir} and opened. macOS will ask the user to allow Screen Recording and Accessibility for it the first time someone views or controls this Mac.`);
    } finally {
      run('hdiutil', ['detach', mnt]);
    }
    return notes;
  }
  // Linux: the .deb needs root.
  if (!fs.existsSync('/usr/bin/apt-get') && !fs.existsSync('/bin/apt-get')) {
    throw new Error(`this system has no apt-get; RockDesk ships .deb packages for Debian / Ubuntu. The package is at ${file}.`);
  }
  const attempts = (process.getuid && process.getuid() === 0)
    ? [['apt-get', ['install', '-y', file]]]
    : [['sudo', ['-n', 'apt-get', 'install', '-y', file]], ['pkexec', ['apt-get', 'install', '-y', file]]];
  let last = null;
  for (const [cmd, args] of attempts) {
    if (cmd !== 'apt-get' && !has(cmd)) continue;
    last = run(cmd, args);
    if (last.ok) break;
  }
  if (!last || !last.ok) {
    throw new Error(`installing needs administrator rights and none could be obtained here. Ask the user to run this in a terminal, then try again: sudo apt install ${file}`);
  }
  // The package does not start the per-user background service by itself.
  const s = run('systemctl', ['--user', 'enable', '--now', 'rockd']);
  notes.push(s.ok
    ? 'Its background service is running for this user (systemctl --user enable --now rockd).'
    : 'Start its background service once: open the RockDesk app, or run `systemctl --user enable --now rockd` (on a server without a desktop: `sudo systemctl enable --now rockd`).');
  return notes;
}

const NOT_INSTALLED =
  'RockDesk is not installed on this computer, so the RockDesk tools (shell, copy, screenshot, click, clipboard, ' +
  'forwarding, ...) are not available yet. Ask the user whether to install it now; if they agree, call ' +
  'install_rockdesk with confirm=true. The computer they want to control needs RockDesk too: ' +
  'https://rockdesk.io/#download (China: https://rockdesk.cn/#download).\n' +
  '这台电脑还没装 RockDesk，所以 RockDesk 的工具（跑命令、传文件、截屏、键鼠、剪贴板、转发……）还用不了。' +
  '先问用户要不要现在安装；同意的话用 confirm=true 调用 install_rockdesk。要控制的那台电脑也得装 RockDesk：https://rockdesk.cn/#download';

const TOOLS = [
  {
    name: 'install_rockdesk',
    title: 'Install RockDesk',
    description:
      'RockDesk is not installed on this computer, which is why its remote-control tools are missing. Only call this after ' +
      'the user has agreed to install it, with confirm=true. It downloads the official RockDesk package for this system from ' +
      'rockdesk.io (rockdesk.cn in China) and installs it: on Windows the installer runs silently (the user may have to ' +
      'approve a UAC prompt), on macOS RockDesk is copied into Applications and opened, on Linux the .deb is installed with ' +
      'apt (needs administrator rights). When it finishes, the RockDesk tools are loaded here.',
    inputSchema: {
      type: 'object',
      properties: { confirm: { type: 'boolean', description: 'true once the user has agreed to install RockDesk on this computer' } },
      required: ['confirm'],
    },
  },
  {
    name: 'rockdesk_status',
    title: 'Why RockDesk tools are missing',
    description: 'Explains why the RockDesk tools are not available yet and how to get started (download links, what the other computer needs).',
    inputSchema: { type: 'object', properties: {} },
  },
];

function setupServer() {
  let initParams = null;
  let proxy = null; // the real `rds mcp` once installed
  let installing = false;
  const send = (obj) => process.stdout.write(JSON.stringify(obj) + '\n');
  const reply = (id, result) => send({ jsonrpc: '2.0', id, result });
  const text = (id, t, isError) => reply(id, { content: [{ type: 'text', text: t }], ...(isError ? { isError: true } : {}) });

  async function install(msg) {
    const id = msg.id;
    const token = msg.params && msg.params._meta && msg.params._meta.progressToken;
    const pkg = packageName();
    if (!pkg) return text(id, `RockDesk has no package for ${process.platform} ${process.arch}. See https://rockdesk.io/#download`, true);
    const url = `${downloadBase()}/download/latest/${pkg.name}`;
    const file = path.join(os.tmpdir(), `rockdesk-${pkg.name}-${Date.now()}${pkg.ext}`);
    let lastPct = -1;
    try {
      const dl = await download(url, file, (got, total) => {
        if (!token || !total) return;
        const pct = Math.floor((got * 100) / total / 10) * 10;
        if (pct === lastPct) return;
        lastPct = pct;
        send({ jsonrpc: '2.0', method: 'notifications/progress', params: { progressToken: token, progress: got, total, message: `downloading RockDesk ${pct}%` } });
      });
      if (process.env.ROCKDESK_MCP_DRY_RUN) {
        return text(id, `Dry run: downloaded ${dl.bytes} bytes from ${url} to ${file}; not installed.`);
      }
      const notes = installPackage(file, pkg);
      try { fs.unlinkSync(file); } catch (e) { /* keep going */ }
      const rds = candidates().find(isNativeRds);
      if (!rds) return text(id, `The installer finished, but RockDesk's rds command is still not found. Ask the user to open the RockDesk app once, then restart this tool. ${notes.join(' ')}`, true);
      const ver = (run(rds, ['--version']).out.split('\n')[0] || '').trim();
      let loaded = '';
      try {
        proxy = await handoff(rds, initParams);
        loaded = 'and its tools are now loaded here (if they do not show up, restart this MCP server or the client).';
      } catch (e) {
        loaded = `but its tools could not be loaded here (${e.message}): restart this MCP server or the client to use them.`;
      }
      text(id, [
        `RockDesk is installed on this computer (${ver}), ${loaded}`,
        ...notes,
        'The computer the user wants to control needs RockDesk too (https://rockdesk.io/#download, China: https://rockdesk.cn/#download): ' +
        'they read its 9-digit ID in the app there and choose how you may connect (its password, a click on "allow", or the same account). ' +
        'New devices start with a free trial.',
      ].join('\n'));
      if (proxy) send({ jsonrpc: '2.0', method: 'notifications/tools/list_changed' });
    } catch (e) {
      text(id, `Installing RockDesk did not work: ${e.message}\nThe user can install it themselves: https://rockdesk.io/#download (China: https://rockdesk.cn/#download).`, true);
    }
  }

  function handle(msg) {
    const id = msg.id;
    const isReq = id !== undefined && id !== null;
    switch (msg.method) {
      case 'initialize': {
        initParams = msg.params || {};
        const want = initParams.protocolVersion;
        const known = ['2025-06-18', '2025-03-26', '2024-11-05'];
        return reply(id, {
          protocolVersion: known.includes(want) ? want : known[0],
          capabilities: { tools: { listChanged: true } },
          serverInfo: { name: 'rockdesk', title: 'RockDesk (setup)', version: VERSION },
          instructions: NOT_INSTALLED,
        });
      }
      case 'ping':
        return isReq && reply(id, {});
      case 'tools/list':
        return reply(id, { tools: TOOLS });
      case 'tools/call': {
        const name = msg.params && msg.params.name;
        const args = (msg.params && msg.params.arguments) || {};
        if (name === 'rockdesk_status') return text(id, NOT_INSTALLED);
        if (name === 'install_rockdesk') {
          if (args.confirm !== true) return text(id, 'Ask the user first whether to install RockDesk on this computer, then call install_rockdesk with confirm=true.');
          if (installing) return text(id, 'RockDesk is already being installed; wait for that call to finish.', true);
          installing = true;
          return install(msg).finally(() => { installing = false; });
        }
        return text(id, NOT_INSTALLED, true);
      }
      default:
        if (isReq) send({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${msg.method}` } });
    }
  }

  const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  rl.on('line', (line) => {
    if (proxy) { proxy.stdin.write(line + '\n'); return; }
    if (!line.trim()) return;
    let msg;
    try { msg = JSON.parse(line); } catch (e) { return send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); }
    Promise.resolve(handle(msg)).catch((e) => {
      if (msg && msg.id !== undefined && msg.id !== null) send({ jsonrpc: '2.0', id: msg.id, error: { code: -32603, message: String(e && e.message || e) } });
    });
  });
  rl.on('close', () => { if (proxy) proxy.stdin.end(); else process.exit(0); });
}

// Starts `rds mcp`, replays the client's initialize to it, then relays both ways.
function handoff(rds, initParams) {
  return new Promise((resolve, reject) => {
    const child = spawn(rds, ['mcp', ...process.argv.slice(2)], { stdio: ['pipe', 'pipe', 'inherit'] });
    const hid = 'rockdesk-mcp-handoff';
    let ready = false;
    const timer = setTimeout(() => { if (!ready) { try { child.kill(); } catch (e) { /* gone */ } reject(new Error('rds mcp did not answer in 20 s')); } }, 20000);
    readline.createInterface({ input: child.stdout, crlfDelay: Infinity }).on('line', (line) => {
      if (ready) return process.stdout.write(line + '\n');
      let m;
      try { m = JSON.parse(line); } catch (e) { return; }
      if (m.id !== hid) return;
      ready = true;
      clearTimeout(timer);
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
      resolve(child);
    });
    child.on('error', (e) => { if (!ready) { clearTimeout(timer); reject(e); } });
    child.on('exit', (code) => {
      if (!ready) { clearTimeout(timer); reject(new Error(`rds mcp exited (${code})`)); } else process.exit(code === null ? 1 : code);
    });
    const params = initParams || { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'rockdesk-mcp', version: VERSION } };
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: hid, method: 'initialize', params }) + '\n');
  });
}

const rds = findRds();
if (rds) runRds(rds);
else setupServer();
