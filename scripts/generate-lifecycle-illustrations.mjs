/**
 * Generate labelled life-stage illustrations for the 36 life_cycles rows.
 *
 * Why illustrations and not photographs
 * -------------------------------------
 * iNaturalist has no life-stage field, so a stage photo can only be identified
 * from free text. Of the candidates a text search surfaced, roughly a third were
 * wrong in ways no regex can catch: an observation of a ladybird *eating* eggs
 * filed under "egg", a lacewing whose caption was the question "Is it eating
 * insect eggs?", and a pasted species article containing every stage noun at once
 * which satisfied the larva and adult gates simultaneously and so supplied two
 * different stages from one photograph. On a page whose only job is showing what
 * each stage looks like, those are worse than a gap, because they teach the wrong
 * thing and look plausible.
 *
 * Illustrations remove the failure mode entirely: nothing is mislabelled, coverage
 * is complete, the style is consistent across all 36, and there is no third-party
 * licence to honour. They also carry information a photograph cannot, since a
 * diagram can label the prolegs, cornicles and wing pads that distinguish a stage.
 *
 * Drawn per family, not generically
 * ---------------------------------
 * Each species group gets its own silhouettes. A noctuid larva (four pairs of
 * abdominal prolegs plus an anal proleg, striped, with a dark head capsule) is
 * visibly different from a coccinellid larva (compact, spiny, tuberculate) and
 * from a chrysopid larva (larviform, with long sickle jaws), and students need to
 * see those differences rather than three interchangeable caterpillars.
 *
 * Output: public/lifecycle-stages/<scientific-name>-<stage>.svg
 * Served as first-party static assets, so no storage upload and no service key.
 *
 *   node scripts/generate-lifecycle-illustrations.mjs
 */
import fs from 'node:fs/promises'
import path from 'node:path'

const OUT_DIR = path.resolve('public/lifecycle-stages')

/* --------------------------------------------------------------------------
 * Shared palette and helpers
 * ------------------------------------------------------------------------ */

const INK = '#3a3428'
const PALE = '#f3ede1'

const el = (n, a = '', inner = '') => `<${n}${a ? ' ' + a : ''}>${inner}</${n}>`

/** Ground line plus a hint of leaf, so a stage reads as being on a plant. */
function substrate({ leaf = 'leaf' }) {
  const shapes = {
    leaf: el(
      'path',
      'd="M40 232 Q200 214 360 232 Q200 252 40 232Z" fill="#cfe0c2" stroke="#9fbb8e" stroke-width="1.5"',
      '',
    ),
    stem: el('rect', 'x="192" y="206" width="16" height="52" rx="7" fill="#b9c7a8"', ''),
    soil: el('rect', 'x="30" y="238" width="340" height="26" rx="10" fill="#e2d6c2"', ''),
    none: '',
  }
  return el('g', '', leaf === 'stem' || leaf === 'soil' ? shapes[leaf] : shapes.leaf)
}

/** Soft background disc so the subject sits in a consistent frame. */
function frame(inner, { label, tint = '#eef4e6' }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300" role="img" aria-label="${label}">
<title>${label}</title>
<rect width="400" height="300" fill="${PALE}"/>
<circle cx="200" cy="140" r="112" fill="${tint}"/>
${inner}
${chip(label)}
</svg>`
}

/** Stage label chip, bottom-left, so the asset is self-identifying if reused. */
function chip(label) {
  const w = Math.round(label.length * 6.4 + 22)
  return `<g><rect x="16" y="262" width="${w}" height="24" rx="12" fill="${INK}" opacity="0.85"/>
<text x="${16 + Math.round(w / 2)}" y="278" font-family="Georgia, serif" font-size="12" fill="#f6f1e6" text-anchor="middle">${label}</text></g>`
}

/* --------------------------------------------------------------------------
 * Noctuidae / Pyralidae / Gelechiidae: moth stages
 * -------------------------------------------------------------------------- */

/** Adult moth, wings spread. Noctuid resting posture, forewing with reniform spot. */
function mothAdult(tint = '#cbb28c') {
  return el(
    'g',
    'stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"',
    el('ellipse', 'cx="200" cy="176" rx="13" ry="46" fill="#8f7a5c"', '') +
      // forewings
      el('path', 'd="M192 140 Q140 112 74 138 Q104 176 192 186Z" fill="' + tint + '"', '') +
      el('path', 'd="M208 140 Q260 112 326 138 Q296 176 208 186Z" fill="' + tint + '"', '') +
      // hindwings peeking behind
      el('path', 'd="M191 166 Q150 168 118 196 Q158 208 191 190Z" fill="#b49a76"', '') +
      el('path', 'd="M209 166 Q250 168 282 196 Q242 208 209 190Z" fill="#b49a76"', '') +
      // reniform stigma + orbicular spot, the noctuid signature
      el('ellipse', 'cx="130" cy="152" rx="9" ry="7" fill="none"', '') +
      el('circle', 'cx="158" cy="140" r="4.5" fill="none"', '') +
      el('ellipse', 'cx="270" cy="152" rx="9" ry="7" fill="none"', '') +
      el('circle', 'cx="242" cy="140" r="4.5" fill="none"', '') +
      // thorax crest, head, antennae
      el('ellipse', 'cx="200" cy="122" rx="17" ry="13" fill="#7d6a4f"', '') +
      el('circle', 'cx="200" cy="106" r="9" fill="#6d5b43"', '') +
      el('path', 'd="M194 100 Q170 86 158 92" fill="none" stroke-width="1.6"', '') +
      el('path', 'd="M206 100 Q230 86 242 92" fill="none" stroke-width="1.6"', ''),
  )
}

/** Noctuid caterpillar: 4 pairs of abdominal prolegs plus an anal proleg. */
function mothLarva(body = '#8fa85c', stripe = '#f0e4c4') {
  const seg = []
  for (let i = 0; i < 9; i += 1) {
    const x = 116 + i * 20
    const r = 13 - Math.abs(i - 4) * 0.7
    seg.push(el('ellipse', `cx="${x}" cy="150" rx="${r + 3}" ry="${r}" fill="${i % 2 ? body : stripe}"`, ''))
  }
  const prolegs = []
  for (let i = 0; i < 4; i += 1) {
    const x = 168 + i * 20
    prolegs.push(el('path', `d="M${x} 163 q-5 13 1 17 q7 2 5 -9Z" fill="${body}"`, ''))
  }
  const thoracicLegs = []
  for (let i = 0; i < 3; i += 1) {
    const x = 122 + i * 12
    thoracicLegs.push(el('path', `d="M${x} 162 l-6 12 l7 2" fill="none" stroke-width="2"`, ''))
  }
  return el(
    'g',
    'stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"',
    seg.join('') +
      prolegs.join('') +
      thoracicLegs.join('') +
      // anal proleg at the rear
      el('path', 'd="M288 162 q8 12 2 16 q-9 1 -7 -9Z" fill="' + body + '"', '') +
      // spiracles
      el('circle', 'cx="160" cy="150" r="2" fill="' + INK + '" stroke="none"', '') +
      el('circle', 'cx="200" cy="150" r="2" fill="' + INK + '" stroke="none"', '') +
      // head capsule
      el('circle', 'cx="104" cy="150" r="14" fill="#6b5a40"', '') +
      el('path', 'd="M96 146 l-8 -5 M98 154 l-8 5" fill="none" stroke-width="1.8"', ''),
  )
}

/** Obtect pupa: tapered, glossy, with abdominal cremaster at the tip. */
function mothPupa() {
  return el(
    'g',
    'stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"',
    el('path', 'd="M186 96 q14 -8 28 0 q10 44 4 100 q-2 16 -18 16 q-16 0 -18 -16 q-6 -56 4 -100Z" fill="#a97f4e"', '') +
      // abdominal segment creases
      el('path', 'd="M182 168 h36 M182 186 h36 M183 204 h34" fill="none" stroke-width="1.4"', '') +
      // wing pads showing through
      el('path', 'd="M188 104 q12 26 2 58 M212 104 q-12 26 -2 58" fill="none" stroke-width="1.4"', '') +
      // cremaster hook
      el('path', 'd="M198 212 q2 12 -4 14 q-6 1 -4 -7Z" fill="#8a663c"', '') +
      el('circle', 'cx="200" cy="90" r="8" fill="#96713f"', ''),
  )
}

/** Flattened ribbed dome, laid singly in a cluster on the leaf surface. */
function mothEgg() {
  const eggs = []
  const spots = [
    [150, 214], [186, 222], [222, 214], [166, 238], [206, 240], [246, 232],
  ]
  for (const [x, y] of spots) {
    eggs.push(el('ellipse', `cx="${x}" cy="${y}" rx="13" ry="8" fill="#f3ecd9"`, ''))
    for (let i = -1; i <= 1; i += 1) {
      eggs.push(el('path', `d="M${x + i * 5} ${y - 6} v12" fill="none" stroke-width="1.1"`, ''))
    }
  }
  return el('g', 'stroke="' + INK + '" stroke-width="2"', eggs.join(''))
}

/* --------------------------------------------------------------------------
 * Coccinellidae: ladybird stages
 * -------------------------------------------------------------------------- */

/** Adult: domed elytra with spot count, pronotum with pale cheek patches. */
function ladybirdAdult() {
  return el(
    'g',
    'stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"',
    el('path', 'd="M200 106 q46 6 46 46 q0 40 -46 44 q-46 -4 -46 -44 q0 -40 46 -46Z" fill="#d4432f"', '') +
      el('path', 'd="M200 108 v86" fill="none"', '') +
      el('circle', 'cx="176" cy="132" r="8" fill="' + INK + '" stroke="none"', '') +
      el('circle', 'cx="224" cy="132" r="8" fill="' + INK + '" stroke="none"', '') +
      el('circle', 'cx="172" cy="164" r="7" fill="' + INK + '" stroke="none"', '') +
      el('circle', 'cx="228" cy="164" r="7" fill="' + INK + '" stroke="none"', '') +
      el('circle', 'cx="200" cy="182" r="6" fill="' + INK + '" stroke="none"', '') +
      // pronotum and head
      el('path', 'd="M176 104 q24 -10 48 0 l-6 14 q-18 -7 -36 0Z" fill="' + INK + '"', '') +
      el('circle', 'cx="200" cy="92" r="11" fill="' + INK + '"', '') +
      el('circle', 'cx="194" cy="90" r="3" fill="#f6f1e6" stroke="none"', '') +
      el('circle', 'cx="206" cy="90" r="3" fill="#f6f1e6" stroke="none"', ''),
  )
}

/** Larva: compact, elongate-oval, dark with tubercles and orange flecks. */
function ladybirdLarva() {
  const seg = []
  for (let i = 0; i < 8; i += 1) {
    const x = 128 + i * 18
    seg.push(el('ellipse', `cx="${x}" cy="150" rx="15" ry="${16 - Math.abs(i - 3.5) * 1.1}" fill="#4a4038"`, ''))
  }
  const legs = []
  for (let i = 0; i < 3; i += 1) {
    legs.push(el('path', `d="M${142 + i * 16} 166 l-4 13 l8 1" fill="none" stroke-width="2"`, ''))
    legs.push(el('path', `d="M${242 + i * 16} 166 l4 13 l-8 1" fill="none" stroke-width="2"`, ''))
  }
  return el(
    'g',
    'stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"',
    seg.join('') +
      legs.join('') +
      // tubercles with orange tips
      el('circle', 'cx="158" cy="138" r="4.5" fill="#e8862f"', '') +
      el('circle', 'cx="200" cy="136" r="4.5" fill="#e8862f"', '') +
      el('circle', 'cx="242" cy="138" r="4.5" fill="#e8862f"', '') +
      el('circle', 'cx="178" cy="160" r="4" fill="#e8862f"', '') +
      el('circle', 'cx="222" cy="160" r="4" fill="#e8862f"', '') +
      el('circle', 'cx="116" cy="150" r="14" fill="#3a332c"', '') +
      el('circle', 'cx="112" cy="146" r="3" fill="#f6f1e6" stroke="none"', ''),
  )
}

/** Pupa: rounded, orange, glued to the leaf with the black wing tips showing. */
function ladybirdPupa() {
  return el(
    'g',
    'stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"',
    el('path', 'd="M200 100 q40 4 40 44 q0 44 -40 50 q-40 -6 -40 -50 q0 -40 40 -44Z" fill="#e8862f"', '') +
      el('path', 'd="M200 104 q-24 2 -30 12 M200 104 q24 2 30 12" fill="none" stroke-width="1.6"', '') +
      el('path', 'd="M176 196 q24 8 48 0 q-2 16 -24 17 q-22 -1 -24 -17Z" fill="' + INK + '"', '') +
      el('circle', 'cx="184" cy="146" r="4" fill="' + INK + '" stroke="none"', '') +
      el('circle', 'cx="216" cy="146" r="4" fill="' + INK + '" stroke="none"', '') +
      el('circle', 'cx="184" cy="176" r="4" fill="' + INK + '" stroke="none"', '') +
      el('circle', 'cx="216" cy="176" r="4" fill="' + INK + '" stroke="none"', '') +
      el('circle', 'cx="200" cy="92" r="10" fill="#4a4038"', ''),
  )
}

/** Spindle-shaped eggs standing upright in a tight cluster. */
function ladybirdEgg() {
  const eggs = []
  for (let i = 0; i < 9; i += 1) {
    const x = 158 + (i % 5) * 21
    const y = 226 - Math.floor(i / 5) * 15
    eggs.push(el('ellipse', `cx="${x}" cy="${y}" rx="7" ry="14" fill="#f5d97a"`, ''))
  }
  return el('g', 'stroke="' + INK + '" stroke-width="2"', eggs.join(''))
}

/* --------------------------------------------------------------------------
 * Chrysopidae: green lacewing stages
 * -------------------------------------------------------------------------- */

/** Adult: membranous wings roof-held, very long filiform antennae, gold eyes. */
function lacewingAdult() {
  const vein = (dir) => {
    const out = []
    for (let i = 1; i <= 5; i += 1) {
      out.push(
        el(
          'path',
          `d="M${200 + dir * 10} 138 Q${200 + dir * (14 + i * 11)} ${146 + i * 4} ${200 + dir * (30 + i * 16)} ${150 + i * 8}" fill="none" stroke-width="1"`,
          '',
        ),
      )
    }
    return out.join('')
  }
  return el(
    'g',
    'stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"',
    el('path', 'd="M198 132 Q140 112 74 132 Q132 168 198 178Z" fill="#cfe3b4" opacity="0.95"', '') +
      el('path', 'd="M202 132 Q260 112 326 132 Q268 168 202 178Z" fill="#cfe3b4" opacity="0.95"', '') +
      vein(-1) +
      vein(1) +
      el('ellipse', 'cx="200" cy="170" rx="10" ry="44" fill="#8fb06a"', '') +
      el('circle', 'cx="200" cy="120" r="13" fill="#7d9a5c"', '') +
      // long antennae, the family hallmark
      el('path', 'd="M193 112 Q164 88 138 74" fill="none" stroke-width="1.6"', '') +
      el('path', 'd="M207 112 Q236 88 262 74" fill="none" stroke-width="1.6"', '') +
      el('circle', 'cx="196" cy="118" r="3.2" fill="#d8a531" stroke="none"', '') +
      el('circle', 'cx="204" cy="118" r="3.2" fill="#d8a531" stroke="none"', ''),
  )
}

/** Larva: larviform, broad thorax, long sickle jaws, spiny walking legs. */
function lacewingLarva() {
  const legs = []
  for (let i = 0; i < 4; i += 1) {
    const x = 176 + i * 26
    legs.push(el('path', `d="M${x} 168 l-9 14 M${x} 168 l9 14" fill="none" stroke-width="2"`, ''))
  }
  return el(
    'g',
    'stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"',
    // abdomen, tapering
    el('ellipse', 'cx="240" cy="152" rx="62" ry="21" fill="#c9a06a"', '') +
      // broad prothorax
      el('ellipse', 'cx="166" cy="148" rx="30" ry="24" fill="#b98f5c"', '') +
      legs.join('') +
      // neck
      el('rect', 'x="130" y="140" width="16" height="15" rx="6" fill="#a87d4d"', '') +
      // sickle jaws
      el('path', 'd="M126 146 Q96 140 78 122 q12 4 20 2 q-8 -8 -6 -18 q10 8 18 20Z" fill="#6f5334"', '') +
      // dorsal tubercles
      el('path', 'd="M210 134 l6 -12 l6 12 M248 132 l6 -12 l6 12" fill="#a87d4d"', '') +
      el('circle', 'cx="146" cy="146" r="3" fill="' + INK + '" stroke="none"', ''),
  )
}

/** Pupa: enclosed in a silken cocoon, the only cocooned stage in this set. */
function lacewingPupa() {
  return el(
    'g',
    'stroke="' + INK + '" stroke-width="2"',
    el('path', 'd="M164 118 q36 -8 72 0 q10 48 0 96 q-36 8 -72 0 q-10 -48 0 -96Z" fill="#e6dcc4"', '') +
      el('path', 'd="M176 132 q26 -5 50 0 M174 158 q28 -5 52 0 M176 184 q26 -5 48 0" fill="none" stroke-width="1.3"', '') +
      el('path', 'd="M200 112 q-3 -14 -8 -20 M200 112 q4 -14 10 -19" fill="none" stroke-width="1.6"', '') +
      el('ellipse', 'cx="200" cy="164" rx="18" ry="34" fill="#b98f5c" opacity="0.5" stroke="none"', ''),
  )
}

/** Eggs on slender pedicels, the diagnostic of green lacewings. */
function lacewingEgg() {
  const eggs = []
  for (let i = 0; i < 6; i += 1) {
    const x = 154 + i * 19
    const lean = (i - 3) * 5
    eggs.push(el('path', `d="M${x} 224 q${lean} -20 ${lean * 1.6} -34" fill="none" stroke-width="1.6"`, ''))
    eggs.push(el('ellipse', `cx="${x + lean * 1.6}" cy="${224 - 40}" rx="5" ry="9" fill="#f0e6cd"`, ''))
  }
  return el('g', 'stroke="' + INK + '" stroke-width="2"', eggs.join(''))
}

/* --------------------------------------------------------------------------
 * Aleyrodidae: whitefly stages
 * -------------------------------------------------------------------------- */

/** Adult: powdery white wings held tent-like over the body. */
function whiteflyAdult() {
  return el(
    'g',
    'stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"',
    el('path', 'd="M198 148 Q158 116 106 128 Q140 176 198 186Z" fill="#f4f6f2"', '') +
      el('path', 'd="M202 148 Q242 116 294 128 Q260 176 202 186Z" fill="#f4f6f2"', '') +
      el('path', 'd="M198 152 Q168 136 134 140 M202 152 Q232 136 266 140" fill="none" stroke-width="1.1"', '') +
      el('ellipse', 'cx="200" cy="172" rx="8" ry="30" fill="#e9d8b4"', '') +
      el('circle', 'cx="200" cy="140" r="11" fill="#d8c9a4"', '') +
      el('circle', 'cx="196" cy="138" r="2.8" fill="' + INK + '" stroke="none"', '') +
      el('circle', 'cx="204" cy="138" r="2.8" fill="' + INK + '" stroke="none"', ''),
  )
}

/** Nymph: flattened, oval, scale-like, waxy fringe. */
function whiteflyNymph() {
  const fringe = []
  for (let i = 0; i < 14; i += 1) {
    const a = (Math.PI / 14) * i
    fringe.push(
      el(
        'path',
        `d="M${200 + Math.cos(a) * 44} ${150 + Math.sin(a) * 28} L${200 + Math.cos(a) * 56} ${150 + Math.sin(a) * 36}"`,
        'stroke-width="1.4"',
        '',
      ),
    )
  }
  return el(
    'g',
    'stroke="' + INK + '" stroke-width="2"',
    fringe.join('') +
      el('ellipse', 'cx="200" cy="150" rx="44" ry="28" fill="#cdd8c0"', '') +
      el('ellipse', 'cx="200" cy="150" rx="30" ry="19" fill="#e2e8d8"', '') +
      el('path', 'd="M178 142 h44 M176 156 h48" fill="none" stroke-width="1.2"', ''),
  )
}

/** Pupa: flattened, dark, heavily waxed, with a wax fringe. */
function whiteflyPupa() {
  const fringe = []
  for (let i = 0; i < 16; i += 1) {
    const a = (Math.PI / 16) * i
    fringe.push(
      el(
        'path',
        `d="M${200 + Math.cos(a) * 40} ${152 + Math.sin(a) * 30} L${200 + Math.cos(a) * 58} ${152 + Math.sin(a) * 44}"`,
        'stroke-width="2"',
        '',
      ),
    )
  }
  return el(
    'g',
    'stroke="' + INK + '" stroke-width="2"',
    fringe.join('') +
      el('ellipse', 'cx="200" cy="152" rx="40" ry="30" fill="#9aa694"', '') +
      el('ellipse', 'cx="200" cy="152" rx="26" ry="20" fill="#b8c4ae"', '') +
      el('path', 'd="M182 142 h36 M180 158 h40 M184 172 h32" fill="none" stroke-width="1.2"', ''),
  )
}

/** Eggs laid in a semicircular ring on the leaf underside, each on a stalk. */
function whiteflyEgg() {
  const eggs = []
  const angles = [200, 220, 240, 260, 280, 300, 320, 340]
  for (const deg of angles) {
    const rad = (deg * Math.PI) / 180
    const x = 200 + Math.cos(rad) * 52
    const y = 236 + Math.sin(rad) * 20
    eggs.push(el('path', `d="M${x} ${y} l0 -10" fill="none" stroke-width="1.4"`, ''))
    eggs.push(el('ellipse', `cx="${x}" cy="${y - 14}" rx="5" ry="7" fill="#f2f0e2"`, ''))
  }
  return el('g', 'stroke="' + INK + '" stroke-width="2"', eggs.join(''))
}

/* --------------------------------------------------------------------------
 * Aphididae: cotton aphid stages
 * -------------------------------------------------------------------------- */

/** Nymph: pear-shaped, cornicles present, no wings. */
function aphidNymph(withWings = false) {
  return el(
    'g',
    'stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"',
    (withWings
      ? el('path', 'd="M188 132 Q146 118 122 146 Q152 162 188 158Z" fill="#dfe7ef" opacity="0.9"', '') +
        el('path', 'd="M212 132 Q254 118 278 146 Q248 162 212 158Z" fill="#dfe7ef" opacity="0.9"', '')
      : '') +
      el('ellipse', 'cx="200" cy="152" rx="42" ry="31" fill="#9dbf6a"', '') +
      el('ellipse', 'cx="192" cy="144" rx="22" ry="16" fill="#b3d186"', '') +
      // cornicles, the aphid diagnostic
      el('path', 'd="M234 146 l16 -6 M234 156 l16 6" fill="none" stroke-width="2.6"', '') +
      // legs and antennae
      el('path', 'd="M182 180 l-10 16 M206 182 l-4 17 M228 178 l10 15" fill="none" stroke-width="2"', '') +
      el('path', 'd="M180 124 q-14 -16 -22 -28 M220 124 q14 -16 22 -28" fill="none" stroke-width="1.6"', '') +
      el('circle', 'cx="200" cy="130" r="9" fill="#8ab257"', ''),
  )
}

/** Overwintering egg: shiny, dark, laid singly on a twig. */
function aphidEgg() {
  return el(
    'g',
    'stroke="' + INK + '" stroke-width="2"',
    el('path', 'd="M60 214 q140 -16 280 0" fill="none" stroke="#a98d68" stroke-width="9" stroke-linecap="round"', '') +
      el('ellipse', 'cx="200" cy="196" rx="15" ry="19" fill="#3c332a"', '') +
      el('ellipse', 'cx="195" cy="190" rx="4" ry="5" fill="#6d6255" stroke="none"', '') +
      el('path', 'd="M188 202 q12 8 24 0" fill="none" stroke-width="1.2"', ''),
  )
}

/* --------------------------------------------------------------------------
 * Thripidae: thrips stages
 * -------------------------------------------------------------------------- */

/** Adult: slender, narrow fringed wings folded over the back. */
function thripsAdult(withWings = true) {
  return el(
    'g',
    'stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"',
    (withWings
      ? el('path', 'd="M198 140 Q160 152 138 196 Q176 186 198 168Z" fill="#e6dcc2"', '') +
        el('path', 'd="M202 140 Q240 152 262 196 Q224 186 202 168Z" fill="#e6dcc2"', '') +
        // fringed wing margins
        el('path', 'd="M198 152 L142 190 M198 158 L146 196 M202 152 L258 190 M202 158 L254 196" fill="none" stroke-width="0.9"', '')
      : '') +
      el('ellipse', 'cx="200" cy="150" rx="14" ry="40" fill="#d8c38a"', '') +
      el('circle', 'cx="200" cy="112" r="9" fill="#c9b273"', '') +
      el('path', 'd="M193 106 q-12 -14 -22 -20 M207 106 q12 -14 22 -20" fill="none" stroke-width="1.5"', '') +
      el('path', 'd="M190 186 l-8 14 M210 186 l8 14" fill="none" stroke-width="2"', ''),
  )
}

/** Nymph: wingless, yellow, with visible abdominal tergites. */
function thripsNymph() {
  const terg = []
  for (let i = 0; i < 6; i += 1) {
    terg.push(el('path', `d="M${184 + i * 6} ${134 + i * 8} h32" fill="none" stroke-width="1.2"`, ''))
  }
  return el(
    'g',
    'stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"',
    el('ellipse', 'cx="200" cy="152" rx="13" ry="38" fill="#e8d489"', '') + terg.join('') +
      el('circle', 'cx="200" cy="114" r="9" fill="#dcc478"', '') +
      el('path', 'd="M194 108 q-12 -14 -22 -20 M206 108 q12 -14 22 -20" fill="none" stroke-width="1.5"', '') +
      el('path', 'd="M190 186 l-8 14 M210 186 l8 14" fill="none" stroke-width="2"', ''),
  )
}

/** Pupa: quiescent, wing pads visible, held on the host plant. */
function thripsPupa() {
  const pads = []
  for (let i = 0; i < 4; i += 1) {
    pads.push(el('path', `d="M${186 + i * 5} ${144 + i * 7} l-14 ${16 + i * 4}" fill="none" stroke-width="1.3"`, ''))
  }
  return el(
    'g',
    'stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"',
    el('ellipse', 'cx="200" cy="156" rx="15" ry="34" fill="#c9b273"', '') + pads.join('') +
      el('circle', 'cx="200" cy="122" r="9" fill="#b89c5e"', '') +
      el('path', 'd="M192 116 q-12 -12 -20 -18 M208 116 q12 -12 20 -18" fill="none" stroke-width="1.4"', '') +
      el('path', 'd="M192 186 l-7 12 M208 186 l7 12" fill="none" stroke-width="2"', ''),
  )
}

/** Eggs laid inside leaf tissue, revealed in a folded section of the blade. */
function thripsEgg() {
  const eggs = []
  for (let i = 0; i < 5; i += 1) {
    eggs.push(el('ellipse', `cx="${170 + i * 16}" cy="${214 + (i % 2) * 8}" rx="8" ry="6" fill="#f4ecd0"`, ''))
  }
  return el(
    'g',
    'stroke="' + INK + '" stroke-width="2"',
    el('path', 'd="M120 240 q80 -46 160 0 q-80 12 -160 0Z" fill="#cfe0c2"', '') + eggs.join('') +
      el('path', 'd="M120 240 q80 20 160 0" fill="none" stroke="#9fbb8e" stroke-width="1.4"', ''),
  )
}

/* --------------------------------------------------------------------------
 * Delphacidae: brown planthopper stages
 * -------------------------------------------------------------------------- */

/** Adult: wedge-shaped, wings roof-held, long saltatorial hind legs. */
function planthopperAdult() {
  const hind = []
  for (let i = 0; i < 3; i += 1) {
    const x = 168 + i * 16
    hind.push(el('path', `d="M${x} 168 l-12 16 l${20 + i * 6} -4" fill="none" stroke-width="2.4"`, ''))
  }
  return el(
    'g',
    'stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"',
    el('path', 'd="M200 96 q14 4 16 26 l-4 84 q-12 6 -24 0 l-4 -84 q2 -22 16 -26Z" fill="#c9a15c"', '') +
      // roof-held forewings
      el('path', 'd="M198 108 Q168 128 158 190 Q186 182 198 160Z" fill="#e0c48d"', '') +
      el('path', 'd="M202 108 Q232 128 242 190 Q214 182 202 160Z" fill="#e0c48d"', '') +
      // wing veins
      el('path', 'd="M200 118 l0 62 M190 130 l-8 48 M210 130 l8 48" fill="none" stroke-width="1.1"', '') +
      hind.join('') +
      el('ellipse', 'cx="200" cy="92" rx="13" ry="10" fill="#b08a4a"', '') +
      el('circle', 'cx="195" cy="90" r="2.6" fill="' + INK + '" stroke="none"', '') +
      el('circle', 'cx="205" cy="90" r="2.6" fill="' + INK + '" stroke="none"', ''),
  )
}

/** Nymph: wingless wedge, waxy filament tuft at the abdomen tip. */
function planthopperNymph() {
  const wax = []
  for (let i = 0; i < 5; i += 1) {
    wax.push(el('path', `d="M192 ${196 + i * 5} q-14 ${i * 2} -22 ${i * 5}" fill="none" stroke="#f2efe0" stroke-width="1.6"`, ''))
    wax.push(el('path', `d="M208 ${196 + i * 5} q14 ${i * 2} 22 ${i * 5}" fill="none" stroke="#f2efe0" stroke-width="1.6"`, ''))
  }
  return el(
    'g',
    'stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"',
    el('path', 'd="M200 110 q16 6 18 34 l-3 62 q-15 8 -30 0 l-3 -62 q2 -28 18 -34Z" fill="#8fae6a"', '') +
      wax.join('') +
      el('path', 'd="M190 176 l-10 12 M210 176 l10 12" fill="none" stroke-width="2.2"', '') +
      el('ellipse', 'cx="200" cy="102" rx="14" ry="10" fill="#7d9a5c"', '') +
      el('circle', 'cx="195" cy="100" r="2.6" fill="' + INK + '" stroke="none"', '') +
      el('circle', 'cx="205" cy="100" r="2.6" fill="' + INK + '" stroke="none"', ''),
  )
}

/* --------------------------------------------------------------------------
 * Species catalogue
 * -------------------------------------------------------------------------- */

const SPECIES = {
  'Bemisia tabaci': { name: 'Silverleaf whitefly', group: 'aleyrodid' },
  'Aphis gossypii': { name: 'Cotton aphid', group: 'aphid' },
  'Helicoverpa armigera': { name: 'Old World bollworm', group: 'moth' },
  'Spodoptera frugiperda': { name: 'Fall armyworm', group: 'moth' },
  'Pectinophora gossypiella': { name: 'Pink bollworm', group: 'moth' },
  'Leucinodes orbonalis': { name: 'Brinjal shoot and fruit borer', group: 'moth' },
  'Coccinella septempunctata': { name: 'Seven-spot ladybird', group: 'ladybird' },
  'Thrips tabaci': { name: 'Onion thrips', group: 'thrips' },
  'Nilaparvata lugens': { name: 'Brown planthopper', group: 'planthopper' },
  'Chrysoperla carnea': { name: 'Common green lacewing', group: 'lacewing' },
}

/**
 * The exact 36 (species, stage) pairs that exist as life_cycles rows.
 *
 * Driving generation from this list rather than from the builder keys keeps the
 * asset set identical to the database. Cotton aphid has an egg builder available
 * (aphids do overwinter as eggs) but no egg row, so iterating the builders would
 * emit a 37th asset that nothing references.
 */
const STAGES = {
  'Bemisia tabaci': ['egg', 'nymph', 'pupa', 'adult'],
  'Aphis gossypii': ['nymph', 'adult'],
  'Helicoverpa armigera': ['egg', 'larva', 'pupa', 'adult'],
  'Spodoptera frugiperda': ['egg', 'larva', 'pupa', 'adult'],
  'Pectinophora gossypiella': ['egg', 'larva', 'pupa', 'adult'],
  'Leucinodes orbonalis': ['egg', 'larva', 'pupa', 'adult'],
  'Coccinella septempunctata': ['egg', 'larva', 'pupa', 'adult'],
  'Thrips tabaci': ['egg', 'nymph', 'pupa', 'adult'],
  'Nilaparvata lugens': ['nymph', 'adult'],
  'Chrysoperla carnea': ['egg', 'larva', 'pupa', 'adult'],
}

/** Build one stage drawing, keyed by family group and stage name. */
const BUILDERS = {
  aleyrodid: { egg: whiteflyEgg, nymph: whiteflyNymph, pupa: whiteflyPupa, adult: whiteflyAdult },
  aphid: {
    egg: aphidEgg,
    nymph: () => aphidNymph(false),
    adult: () => aphidNymph(true),
  },
  moth: { egg: mothEgg, larva: () => mothLarva(), pupa: mothPupa, adult: () => mothAdult() },
  ladybird: { egg: ladybirdEgg, larva: ladybirdLarva, pupa: ladybirdPupa, adult: ladybirdAdult },
  lacewing: { egg: lacewingEgg, larva: lacewingLarva, pupa: lacewingPupa, adult: lacewingAdult },
  thrips: { egg: thripsEgg, nymph: thripsNymph, pupa: thripsPupa, adult: () => thripsAdult(true) },
  planthopper: { nymph: planthopperNymph, adult: planthopperAdult },
}

/** Ground/host treatment per group, so a soil-dwelling or stem stage still sits on something. */
const GROUND = {
  aleyrodid: { leaf: 'leaf' },
  aphid: { leaf: 'stem' },
  moth: { leaf: 'leaf' },
  ladybird: { leaf: 'leaf' },
  lacewing: { leaf: 'leaf' },
  thrips: { leaf: 'leaf' },
  planthopper: { leaf: 'stem' },
}

const TINT = {
  egg: '#f3f0e4',
  larva: '#eaf2e2',
  nymph: '#e7f0ef',
  pupa: '#f0e9e0',
  adult: '#e9f0e4',
}

/* --------------------------------------------------------------------------
 * Generate
 * -------------------------------------------------------------------------- */

/**
 * Round long decimals produced by Math.cos/Math.sin.
 *
 * The wax-fringe loops emit coordinates like 242.89682813600024, which are
 * accurate far beyond a pixel and roughly triple the size of every file.
 */
function tidy(svg) {
  return svg.replace(/-?\d+\.\d{2,}/g, (n) => String(Math.round(Number(n) * 10) / 10))
}

await fs.mkdir(OUT_DIR, { recursive: true })

const written = []
const missing = []

for (const [scientific, meta] of Object.entries(SPECIES)) {
  const builders = BUILDERS[meta.group]
  for (const stage of STAGES[scientific] ?? []) {
    const build = builders[stage]
    if (!build) {
      missing.push(scientific + ' / ' + stage)
      continue
    }
    const label = meta.name + ' ' + stage
    const svg = frame(substrate(GROUND[meta.group]) + build(), { label, tint: TINT[stage] })
    const slug = scientific.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const file = slug + '-' + stage + '.svg'
    await fs.writeFile(path.join(OUT_DIR, file), tidy(svg) + '\n', 'utf8')
    written.push({ scientific_name: scientific, common_name: meta.name, stage, file })
  }
}

if (missing.length) {
  console.error('no builder for: ' + missing.join(', '))
  process.exitCode = 1
}

console.log('wrote ' + written.length + ' illustrations to ' + path.relative(process.cwd(), OUT_DIR))
const byStage = written.reduce((acc, w) => {
  acc[w.stage] = (acc[w.stage] ?? 0) + 1
  return acc
}, {})
for (const [stage, count] of Object.entries(byStage)) console.log('  ' + stage.padEnd(8) + count)
console.log('\nspecies: ' + Object.keys(SPECIES).length + '   total: ' + written.length)

/* --------------------------------------------------------------------------
 * Emit the manifest and the migration from the same catalogue
 *
 * The filenames above are derived from the scientific name and stage, and the
 * database has to store exactly those paths. Emitting both from one place means
 * a new species or a renamed stage cannot leave the SVG on disk disagreeing with
 * the row in life_cycles.
 * -------------------------------------------------------------------------- */

const MANIFEST = path.resolve('src/data/lifecycle-illustrations.json')
const MIGRATION = path.resolve('supabase/migrations/00017_lifecycle_illustrations.sql')
const ASSET_DIR = '/lifecycle-stages'

const manifest = written.map((w) => ({
  ...w,
  image_url: ASSET_DIR + '/' + w.file,
  licence: 'project-original',
}))
await fs.mkdir(path.dirname(MANIFEST), { recursive: true })
await fs.writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
console.log('wrote ' + manifest.length + ' entries to ' + path.relative(process.cwd(), MANIFEST))

/** Quote a value as a SQL string literal, doubling any embedded apostrophe. */
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'"

const statements = manifest
  .map(
    (m) =>
      'update public.life_cycles lc\n' +
      '   set image_url = ' + q(m.image_url) + '\n' +
      '  from public.insects i\n' +
      " where i.id = lc.insect_id\n" +
      "   and i.scientific_name = " + q(m.scientific_name) + '\n' +
      '   and lc.stage_name = ' + q(m.stage) + ';',
  )
  .join('\n\n')

const sql = [
  '-- Life-cycle stage illustrations.',
  '--',
  '-- Generated by scripts/generate-lifecycle-illustrations.mjs. Do not edit by hand;',
  '-- rerun the generator instead so the paths stay in step with the SVG files in',
  '-- public/lifecycle-stages.',
  '--',
  '-- These are first-party diagrams served as static assets, not photographs in the',
  '-- insect-images storage bucket, so the values are root-relative asset paths and',
  '-- deliberately do not go through useImageUrl.',
  '--',
  '-- Idempotent: each statement re-sets the same value, so re-running is safe.',
  '',
  statements,
  '',
].join('\n')

await fs.writeFile(MIGRATION, sql, 'utf8')
console.log('wrote ' + (statements.match(/^update/gm) ?? []).length + ' statements to ' + path.relative(process.cwd(), MIGRATION))