// RockDesk skill for DeepSeek Harness (dsh): registers skills/rockd-remote-control/SKILL.md
// with ctx.skills, the same way dsh's own packaged skills do. A copy the user put in
// ~/.agents/skills or ~/.dsh/skills ranks higher and wins.
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const SKILL_DIR = new URL('../skills/rockd-remote-control/', import.meta.url)
const SKILL_FILE = new URL('SKILL.md', SKILL_DIR)
const RESOURCE_BASE = { kind: 'directory', path: fileURLToPath(SKILL_DIR) }
const INVOCATION = { modelInvocable: true, userInvocable: true }
const PROVIDER = 'rockdesk'
const RANK = 600 // BUNDLED_SKILL_RANK in @deepseek-ai/dsh-skill

function parse (text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text)
  if (!m) throw new Error('rockdesk: SKILL.md has no frontmatter')
  const fm = m[1]
  const name = /^name:\s*([a-z0-9-]+)\s*$/m.exec(fm)?.[1]
  let description
  const folded = /^description:\s*>-?[ \t]*\r?\n((?:[ \t]+\S.*(?:\r?\n|$))+)/m.exec(fm)
  if (folded) description = folded[1].split(/\r?\n/).map(l => l.trim()).filter(Boolean).join(' ')
  else description = /^description:\s*(.+)$/m.exec(fm)?.[1].trim().replace(/^(["'])(.*)\1$/, '$2')
  if (!name || !description) throw new Error('rockdesk: SKILL.md needs name and description')
  return { name, description, content: text.slice(m[0].length) }
}

let loaded
const load = () => (loaded ??= readFile(SKILL_FILE, 'utf8').then(parse))

const provider = {
  name: PROVIDER,
  async list () {
    const s = await load()
    return [{
      name: s.name,
      description: s.description,
      invocation: INVOCATION,
      provider: PROVIDER,
      source: 'bundled',
      resourceBase: RESOURCE_BASE,
      rank: RANK,
      locator: SKILL_FILE.href,
    }]
  },
  async get () {
    const s = await load()
    return {
      name: s.name,
      description: s.description,
      invocation: INVOCATION,
      provider: PROVIDER,
      source: 'bundled',
      resourceBase: RESOURCE_BASE,
      content: s.content,
    }
  },
}

export const name = 'rockdesk-skill'
export const inject = ['skills']

export function apply (ctx) {
  ctx.skills.registerProvider(() => provider)
}
