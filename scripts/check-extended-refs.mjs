import fs from 'node:fs';

const MIG = 'supabase/migrations/00015_populate_all_orders.sql';
const SCHEMA = 'supabase/migrations/00002_knowledge_schema.sql';
const CACHE = '.cache/specimens-extended';

const errors = [];
const fail = (m) => errors.push(m);

const raw = fs.readFileSync(MIG, 'utf8');
const schema = fs.readFileSync(SCHEMA, 'utf8');

// ---------------------------------------------------------------------------
// String-aware SQL splitting: semicolons and parens inside string literals and
// dollar-quoted bodies must not be treated as delimiters.
// ---------------------------------------------------------------------------
function stripComments(sql) {
  let out = '';
  let inStr = false;
  for (let i = 0; i < sql.length; i += 1) {
    const c = sql[i];
    if (inStr) {
      out += c;
      if (c === "'") {
        if (sql[i + 1] === "'") { out += sql[++i]; } else { inStr = false; }
      }
      continue;
    }
    if (c === "'") { inStr = true; out += c; continue; }
    if (c === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i += 1;
      out += '\n';
      continue;
    }
    out += c;
  }
  return out;
}

function splitStatements(sql) {
  const stmts = [];
  let depth = 0;
  let inStr = false;
  let dollarTag = null;
  let start = 0;
  for (let i = 0; i < sql.length; i += 1) {
    const c = sql[i];
    // Dollar-quoted bodies ($$ ... $$ / $tag$ ... $tag$) may contain anything,
    // including semicolons, quotes and parentheses.
    if (dollarTag) {
      if (c === '$' && sql.startsWith(dollarTag, i)) {
        i += dollarTag.length - 1;
        dollarTag = null;
      }
      continue;
    }
    if (inStr) {
      if (c === "'") {
        if (sql[i + 1] === "'") i += 1; else inStr = false;
      }
      continue;
    }
    if (c === "'") { inStr = true; continue; }
    if (c === '$') {
      const m = sql.slice(i).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
      if (m) { dollarTag = m[0]; i += m[0].length - 1; continue; }
    }
    if (c === '(') { depth += 1; continue; }
    if (c === ')') { depth -= 1; continue; }
    if (c === ';' && depth === 0) { stmts.push(sql.slice(start, i)); start = i + 1; }
  }
  stmts.push(sql.slice(start));
  return stmts.map((s) => s.trim()).filter(Boolean);
}

// Split a VALUES list into tuples, honouring nesting and quoting.
function parseTuples(valuesText) {
  const tuples = [];
  let depth = 0;
  let inStr = false;
  let cur = '';
  for (let i = 0; i < valuesText.length; i += 1) {
    const c = valuesText[i];
    if (inStr) {
      cur += c;
      if (c === "'") {
        if (valuesText[i + 1] === "'") { cur += valuesText[++i]; } else { inStr = false; }
      }
      continue;
    }
    if (c === "'") { inStr = true; cur += c; continue; }
    if (c === '(') { depth += 1; if (depth === 1) { cur = ''; continue; } }
    if (c === ')') { depth -= 1; if (depth === 0) { tuples.push(cur); cur = ''; continue; } }
    if (depth >= 1) cur += c;
  }
  return tuples.map(splitTopLevel);
}

function splitTopLevel(tupleText) {
  const parts = [];
  let depth = 0;
  let inStr = false;
  let cur = '';
  for (let i = 0; i < tupleText.length; i += 1) {
    const c = tupleText[i];
    if (inStr) {
      cur += c;
      if (c === "'") {
        if (tupleText[i + 1] === "'") { cur += tupleText[++i]; } else { inStr = false; }
      }
      continue;
    }
    if (c === "'") { inStr = true; cur += c; continue; }
    if (c === '(') depth += 1;
    if (c === ')') depth -= 1;
    if (c === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

const lit = (p) => {
  if (typeof p !== 'string') return null;
  const m = p.match(/^'((?:[^']|'')*)'$/s);
  return m ? m[1].replace(/''/g, "'") : null;
};

const clean = stripComments(raw);
const statements = splitStatements(clean);

const tableStmt = {};
for (const s of statements) {
  // Drop any trailing conflict clause; it is not part of the VALUES list.
  const body = s.replace(/\bon\s+conflict\b[\s\S]*$/i, '');
  const m = body.match(/insert into public\.(\w+)\s*\(([^)]*)\)\s*values\s*([\s\S]*)$/i);
  if (!m) continue;
  const [, table, cols, values] = m;
  tableStmt[table] = { cols: cols.split(',').map((c) => c.trim()), tuples: parseTuples(values) };
}

for (const t of ['taxonomic_families', 'taxonomic_genera', 'insects']) {
  if (!tableStmt[t]) fail(`no insert statement parsed for ${t}`);
}

/**
 * Every VALUES tuple must supply exactly as many expressions as the column list
 * declares, or Postgres aborts the whole statement with:
 *   ERROR: INSERT has more expressions than target columns
 * A semantic check that never counts expressions cannot catch this, so do it
 * explicitly for every table.
 */
for (const [table, s] of Object.entries(tableStmt)) {
  const width = s.cols.length;
  const bad = s.tuples.map((t, i) => [i, t.length]).filter(([, n]) => n !== width);
  if (bad.length) {
    fail(`${table}: ${width} columns but row(s) ${bad.map(([i, n]) => `#${i + 1} has ${n}`).join(', ')}`);
  } else {
    console.log(`${table}: ${width} columns x ${s.tuples.length} rows`);
  }
}

// ---------------------------------------------------------------------------
// Schema expectations.
// ---------------------------------------------------------------------------
if (!/order_id\s+uuid\s+not\s+null\s+references\s+public\.taxonomic_orders/.test(schema)) {
  fail('schema: expected NOT NULL taxonomic_families.order_id');
}
for (const t of ['taxonomic_orders', 'taxonomic_families', 'taxonomic_genera']) {
  if (!new RegExp(`create table if not exists public\\.${t}[\\s\\S]*?name\\s+text\\s+not null unique`).test(schema)) {
    fail(`schema: expected plain unique constraint on ${t}.name`);
  }
}
if (!/create unique index if not exists insects_scientific_name_key on public\.insects \(lower\(scientific_name\)\)/.test(schema)) {
  fail('schema: expected lower(scientific_name) unique index');
}

// Conflict targets must name a column with a real unique constraint.
const uniqueCols = new Set(['id', 'name']);
for (const m of clean.matchAll(/on conflict \(([^)]+)\)/g)) {
  const col = m[1].trim();
  if (!uniqueCols.has(col)) {
    fail(`conflict target "${col}" has no matching unique constraint (only id and name do)`);
  }
}

// ---------------------------------------------------------------------------
// Orders (00014 / 00011).
// ---------------------------------------------------------------------------
const orderNames = [
  'Archaeognatha', 'Zygentoma', 'Ephemeroptera', 'Odonata', 'Plecoptera',
  'Dermaptera', 'Zoraptera', 'Mantodea', 'Blattodea', 'Grylloblattodea',
  'Mantophasmatodea', 'Phasmatodea', 'Embioptera', 'Psocodea', 'Megaloptera',
  'Raphidioptera', 'Mecoptera', 'Siphonaptera', 'Trichoptera', 'Strepsiptera',
];

// Families: id -> {name, order}
const FAMILY_ORDER = {
  Archaeognathidae: 'Archaeognatha', Lepismatidae: 'Zygentoma',
  Ephemeridae: 'Ephemeroptera', Libellulidae: 'Odonata', Perlidae: 'Plecoptera',
  Forficulidae: 'Dermaptera', Zorotypidae: 'Zoraptera', Mantidae: 'Mantodea',
  Rhinotermitidae: 'Blattodea', Grylloblattidae: 'Grylloblattodea',
  Mantophasmatidae: 'Mantophasmatodea', Phylliidae: 'Phasmatodea',
  Oligotomidae: 'Embioptera', Liposcelididae: 'Psocodea', Corydalidae: 'Megaloptera',
  Raphidiidae: 'Raphidioptera', Panorpidae: 'Mecoptera', Pulicidae: 'Siphonaptera',
  Limnephilidae: 'Trichoptera', Stylopidae: 'Strepsiptera',
};

const fams = tableStmt.taxonomic_families;
if (fams && !fams.cols.includes('order_id')) {
  fail('taxonomic_families insert omits order_id (NOT NULL)');
}
const subOrder = (p) => {
  if (typeof p !== 'string') return null;
  const m = p.match(/^\(?\s*select\s+id\s+from\s+public\.taxonomic_orders\s+where\s+name\s*=\s*'([A-Za-z]+)'\s*\)?$/i);
  return m ? m[1] : null;
};

const familyById = new Map();
if (fams) {
  const n = fams.tuples.length;
  if (n !== 20) fail(`families: ${n} tuples, expected 20`);
  for (const t of fams.tuples) {
    const id = lit(t[0]);
    const name = lit(t[1]);
    const order = subOrder(t[t.length - 1]);
    if (!id || !name) { fail(`families: unparsable tuple ${JSON.stringify(t.slice(0, 2))}`); continue; }
    if (!order) fail(`families: ${name} has no order_id subquery`);
    if (FAMILY_ORDER[name] !== order) fail(`families: ${name} -> ${order}, expected ${FAMILY_ORDER[name]}`);
    if (!orderNames.includes(order)) fail(`families: order "${order}" is not a modern order`);
    if (familyById.has(id)) fail(`families: duplicate id ${id}`);
    familyById.set(id, { name, order });
  }
}

// Genera: id -> {name, familyId}
const gens = tableStmt.taxonomic_genera;
const genusById = new Map();
if (gens) {
  const n = gens.tuples.length;
  if (n !== 20) fail(`genera: ${n} tuples, expected 20`);
  for (const t of gens.tuples) {
    const id = lit(t[0]);
    const name = lit(t[1]);
    const familyId = lit(t[2]);
    if (!id || !name || !familyId) { fail(`genera: unparsable tuple`); continue; }
    if (!familyById.has(familyId)) fail(`genera: ${name} -> unknown family id ${familyId}`);
    if (genusById.has(id)) fail(`genera: duplicate id ${id}`);
    genusById.set(id, { name, familyId });
  }
}

// Species
const ins = tableStmt.insects;
const species = [];
if (ins) {
  const n = ins.tuples.length;
  if (n !== 20) fail(`insects: ${n} tuples, expected 20`);
  for (const t of ins.tuples) {
    const sci = lit(t[1]);
    const genusId = lit(t[3]);
    const familyId = lit(t[4]);
    const order = subOrder(t[5]);
    if (!sci || !genusId || !familyId) { fail(`insects: unparsable tuple`); continue; }
    const g = genusById.get(genusId);
    if (!g) { fail(`species: ${sci} -> unknown genus id ${genusId}`); continue; }
    if (!familyById.has(familyId)) { fail(`species: ${sci} -> unknown family id ${familyId}`); continue; }
    if (g.familyId !== familyId) {
      fail(`species: ${sci} genus ${g.name} is in ${familyById.get(g.familyId).name}, row claims ${familyById.get(familyId).name}`);
    }
    if (familyById.get(familyId).order !== order) {
      fail(`species: ${sci} family order ${familyById.get(familyId).order} != row order ${order}`);
    }
    if (!orderNames.includes(order)) fail(`species: ${sci} order "${order}" unknown`);
    if (!/ sp\.$/.test(sci)) {
      const genus = sci.split(' ')[0];
      if (genus !== g.name) fail(`species: "${sci}" is not in its genus row "${g.name}"`);
    }
    const status = lit(t[13]);
    if (!['draft', 'reviewed', 'verified'].includes(status)) {
      fail(`species: ${sci} has invalid verification_status ${status}`);
    }
    species.push({ sci, order });
  }
}

const covered = new Set(species.map((s) => s.order));
for (const o of orderNames) if (!covered.has(o)) fail(`order ${o} has no species`);

// ---------------------------------------------------------------------------
// Image update block.
// ---------------------------------------------------------------------------
const imgStmt = statements.find((s) => /with source \(scientific_name, image_ref\)/i.test(s));
if (!imgStmt) fail('image update statement not found');
const pairs = [...(imgStmt ?? '').matchAll(/\('([^']+)',\s*'insect-images\/([^']+)'\)/g)]
  .map(([, sci, file]) => [sci, file]);

if (pairs.length !== 20) fail(`images: ${pairs.length} refs, expected 20`);

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
for (const [sci, file] of pairs) {
  if (!species.some((s) => s.sci === sci)) fail(`images: "${sci}" has no species row`);
  const expected = `${slug(sci.replace(/ sp\.$/, ''))}.jpg`;
  if (file !== expected) fail(`images: "${sci}" -> ${file}, expected ${expected}`);
  if (!fs.existsSync(`${CACHE}/${file}`)) fail(`images: cached file missing ${CACHE}/${file}`);
}
for (const s of species) if (!pairs.some(([sci]) => sci === s.sci)) fail(`images: no ref for ${s.sci}`);
if (imgStmt && /verification_status\s*=\s*'reviewed'/.test(imgStmt)) {
  fail('images: update filtered on verification_status, skipping verified rows');
}

// ---------------------------------------------------------------------------
console.log(`statements parsed: ${statements.length}`);
console.log(`families: ${familyById.size}  genera: ${genusById.size}  species: ${species.length}`);
console.log(`orders covered: ${covered.size}/${orderNames.length}`);
console.log(`image refs: ${pairs.length}`);
if (errors.length) {
  console.error(`\n${errors.length} problem(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log('\nno semantic problems found');
