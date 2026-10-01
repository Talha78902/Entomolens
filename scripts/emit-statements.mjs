import fs from 'node:fs'
import path from 'node:path'

const SRC = 'supabase/migrations/00015_populate_all_orders.sql'
const OUT = '.cache/00015-statements'

const sql = fs.readFileSync(SRC, 'utf8')

// String-, paren- and dollar-quote-aware statement split.
function stripComments(s) {
  let out = '', inStr = false
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i]
    if (inStr) { out += c; if (c === "'") { if (s[i + 1] === "'") out += s[++i]; else inStr = false } continue }
    if (c === "'") { inStr = true; out += c; continue }
    if (c === '-' && s[i + 1] === '-') { while (i < s.length && s[i] !== '\n') i += 1; out += '\n'; continue }
    out += c
  }
  return out
}
function splitStatements(s) {
  const st = []; let depth = 0, inStr = false, dq = null, start = 0
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i]
    if (dq) { if (c === '$' && s.startsWith(dq, i)) { i += dq.length - 1; dq = null } continue }
    if (inStr) { if (c === "'") { if (s[i + 1] === "'") i += 1; else inStr = false } continue }
    if (c === "'") { inStr = true; continue }
    if (c === '$') { const m = s.slice(i).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/); if (m) { dq = m[0]; i += m[0].length - 1; continue } }
    if (c === '(') { depth += 1; continue }
    if (c === ')') { depth -= 1; continue }
    if (c === ';' && depth === 0) { st.push(s.slice(start, i)); start = i + 1 }
  }
  st.push(s.slice(start))
  return st.map((x) => x.trim()).filter(Boolean)
}

const stmts = splitStatements(stripComments(sql))
fs.mkdirSync(OUT, { recursive: true })

const label = (s) => {
  const m = s.match(/insert into public\.(\w+)/i)
  if (m) return `1-${m[1]}`
  if (/with source/i.test(s)) return '4-images'
  if (/^do\s*\$\$/i.test(s)) return '5-report'
  return 'x'
}

console.log(`${stmts.length} statements written to ${OUT}/\n`)
stmts.forEach((s, i) => {
  const name = `${String(i + 1).padStart(2, '0')}-${label(s)}.sql`
  const body = `${s.trim()};\n`
  fs.writeFileSync(path.join(OUT, name), body, 'utf8')
  const first = s.trim().split('\n')[0].slice(0, 62)
  console.log(`  ${name.padEnd(34)} ${String(body.length).padStart(6)} B  ${first}`)
})

// The families statement is the one that keeps biting: assert its shape here too.
const fam = stmts.find((s) => /insert into public\.taxonomic_families/i.test(s))
if (fam) {
  const cols = fam.match(/\(([^)]*)\)\s*values/i)[1].split(',').length
  const rows = (fam.match(/\n  \(/g) ?? []).length
  console.log(`\nfamilies check: ${cols} columns, ${rows} rows`)
  if (cols !== 5 || rows !== 20) {
    console.error('UNEXPECTED shape — do not run this file')
    process.exit(1)
  }
}