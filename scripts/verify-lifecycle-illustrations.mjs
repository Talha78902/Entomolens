/**
 * Verify the generated life-stage illustrations before they are wired into the UI.
 *
 * Generated SVG is easy to get subtly wrong: a <path> missing its d attribute, or
 * an arithmetic slip producing NaN coordinates, still produces a well-formed file
 * that simply renders blank. Counting files is not enough, so this checks geometry.
 *
 *   node scripts/verify-lifecycle-illustrations.mjs
 */
import fs from 'node:fs/promises'
import path from 'node:path'

const DIR = path.resolve('public/lifecycle-stages')

/**
 * Return shapes that resolve to neither a fill nor a stroke, taking <g>
 * inheritance into account. A naive per-tag regex flags legitimate children of a
 * styled group, which is how the first version of this check produced 30 false
 * positives on the whitefly wax fringes.
 */
function unstyledShapes(svg) {
  const out = []
  const stack = [] // each frame: { fill: boolean, stroke: boolean }
  const tokens = svg.match(/<(\/?)(?:g|path|circle|ellipse|rect)\b[^>]*>/g) ?? []

  for (const t of tokens) {
    const closing = t.startsWith('</')

    if (t.startsWith('<g')) {
      if (closing) {
        stack.pop()
        continue
      }
      const parent = stack[stack.length - 1] ?? { fill: false, stroke: false }
      stack.push({
        fill: /\bfill=/.test(t) || parent.fill,
        stroke: /\bstroke=/.test(t) || parent.stroke,
      })
      continue
    }

    // closing tag for a shape, not a shape
    if (closing) continue

    const parent = stack[stack.length - 1] ?? { fill: false, stroke: false }
    const hasFill = /\bfill=/.test(t) || parent.fill
    const hasStroke = /\bstroke=/.test(t) || parent.stroke
    if (!hasFill && !hasStroke) out.push(t)
  }

  return out
}

const files = (await fs.readdir(DIR)).filter((f) => f.endsWith('.svg')).sort()

const problems = []
let pathCount = 0

for (const file of files) {
  const svg = await fs.readFile(path.join(DIR, file), 'utf8')
  const fail = (msg) => problems.push(file + ': ' + msg)

  if (!svg.startsWith('<svg')) fail('does not start with <svg')
  if (!svg.trimEnd().endsWith('</svg>')) fail('does not end with </svg>')
  if (!svg.includes('viewBox="0 0 400 300"')) fail('missing or wrong viewBox')
  if (!/<title>[^<]+<\/title>/.test(svg)) fail('missing <title> for accessibility')
  if (!/role="img"/.test(svg)) fail('missing role="img"')
  if (!/aria-label="[^"]+"/.test(svg)) fail('missing aria-label')

  // NaN / undefined coordinates render as nothing at all
  if (/NaN|undefined|Infinity/.test(svg)) fail('contains NaN/undefined/Infinity')

  // every <path> must carry geometry
  const paths = svg.match(/<path\b[^>]*>/g) ?? []
  pathCount += paths.length
  for (const p of paths) {
    if (!/\bd="/.test(p)) fail('<path> without d attribute: ' + p.slice(0, 70))
    if (/\bd=""/.test(p)) fail('<path> with empty d')
    if (/\bd="[^"]*NaN/.test(p)) fail('<path> with NaN in d')
  }

  // a drawing with almost no shapes is an empty illustration
  const shapes = (svg.match(/<(path|circle|ellipse|rect)\b/g) ?? []).length
  if (shapes < 5) fail('only ' + shapes + ' shapes, drawing looks empty')

  // a shape with neither fill nor stroke either renders black (SVG default fill)
  // or not at all, which is how the leaf substrate went wrong. Attributes are
  // inherited from ancestor <g> elements, so walk the tree rather than matching
  // each tag in isolation.
  const styleProblems = unstyledShapes(svg)
  for (const s of styleProblems) fail('shape with no fill and no stroke in scope: ' + s.slice(0, 60))

  // rough balance check: unbalanced grouping tags break the whole render
  const opens = (svg.match(/<g[\s>]/g) ?? []).length
  const closes = (svg.match(/<\/g>/g) ?? []).length
  if (opens !== closes) fail('unbalanced <g>: ' + opens + ' open vs ' + closes + ' close')
}

console.log('files: ' + files.length + '   paths: ' + pathCount)

const byStage = {}
for (const f of files) {
  const stage = f.replace(/^.*-/, '').replace(/\.svg$/, '')
  byStage[stage] = (byStage[stage] ?? 0) + 1
}
for (const [s, n] of Object.entries(byStage).sort()) console.log('  ' + s.padEnd(8) + n)

if (files.length !== 36) problems.push('expected 36 files, found ' + files.length)

if (problems.length) {
  console.error('\n' + problems.length + ' problem(s):')
  for (const p of problems) console.error('  ' + p)
  process.exit(1)
}
console.log('\nall ' + files.length + ' illustrations valid')