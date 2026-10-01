/*
 * Split a Postgres dollar-quoted migration into statements the Supabase SQL
 * editor will accept, and sanity-check each one.
 *
 * The problem this solves: 00015 wraps its 20-row insects INSERT in a DO $$
 * block for reporting, so a naive split on ";" tears that block in half. This
 * tracks dollar-quote depth properly and then reports, per statement, the
 * obvious failure modes — unbalanced parens, statements that begin but do not
 * end with a keyword, and a final statement with no terminator.
 */
import fs from 'node:fs'

const file = process.argv[2]
if (!file) {
  console.error('usage: node scripts/split-migration.mjs <file.sql>')
  process.exit(1)
}
const sql = fs.readFileSync(file, 'utf8')

// Strip line comments so a ';' or '--' inside prose cannot confuse the splitter.
let out = ''
let dollarTag = null
for (let i = 0; i < sql.length; i++) {
  const lineEnd = sql.indexOf('\n', i)
  const atLineEnd = lineEnd === -1
  if (dollarTag === null) {
    const dollar = sql.slice(i).match(/^\$[A-Za-z_]*\$/)
    if (dollar && (i === 0 || sql[i - 1] === '\n')) {
      dollarTag = dollar[0]
      out += dollarTag
      i += dollarTag.length - 1
      continue
    }
    if (sql.startsWith('--', i) && (i === 0 || sql[i - 1] === '\n')) {
      const stop = atLineEnd ? sql.length : lineEnd
      i = stop - 1
      continue
    }
    out += sql[i]
  } else {
    if (sql.startsWith(dollarTag, i)) {
      out += dollarTag
      i += dollarTag.length - 1
      dollarTag = null
      continue
    }
    out += sql[i]
  }
}

const statements = []
let depth = 0
let current = ''
let inSingle = false
let activeTag = null
for (let i = 0; i < out.length; i++) {
  const ch = out[i]

  // Inside a dollar-quoted body, a ';' is part of the body, not a terminator.
  // Without this, a DO $$ ... $$ block is shredded into its inner declarations.
  if (activeTag !== null) {
    current += ch
    if (out.startsWith(activeTag, i)) {
      current += activeTag
      i += activeTag.length - 1
      activeTag = null
    }
    continue
  }

  current += ch
  if (ch === "'") {
    inSingle = !inSingle
    continue
  }
  if (inSingle) continue
  if (ch === '(') depth++
  if (ch === ')') depth--

  if (ch === '$') {
    const tag = out.slice(i).match(/^\$[A-Za-z_]*\$/)
    if (tag) {
      activeTag = tag[0]
      current += tag[0]
      i += tag[0].length - 1
      continue
    }
  }

  if (ch === ';' && depth === 0) {
    const trimmed = current.trim()
    if (trimmed.replace(/;/g, '').trim()) statements.push(trimmed)
    current = ''
  }
}
const tail = current.trim()
if (tail) statements.push(tail)

console.log(`file: ${file}`)
console.log(`statements: ${statements.length}\n`)

let problems = 0
statements.forEach((s, i) => {
  const first = s.split('\n')[0].slice(0, 62)
  const opens = (s.match(/\(/g) ?? []).length
  const closes = (s.match(/\)/g) ?? []).length
  const notes = []
  if (opens !== closes) notes.push(`parens ${opens}/${closes}`)
  if (!/;\s*$/s.test(s)) notes.push('NO TERMINATOR')
  if (!/^(insert|update|delete|create|drop|alter|with|do|select|begin|commit)/i.test(first)) {
    notes.push(`odd start: "${first.trim().slice(0, 40)}"`)
  }
  if (notes.length) {
    problems++
    console.log(`  [${i + 1}] ${notes.join(' | ')}`)
    console.log(`       ${first.trim()}`)
  }
})
console.log(problems === 0 ? '\nno structural problems found' : `\n${problems} statement(s) flagged`)
