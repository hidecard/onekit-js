import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const declaration = resolve('dist/types/index.d.ts');
if (!existsSync(declaration)) {
  console.error(`Declaration entrypoint is missing: ${declaration}`);
  process.exit(1);
}

const source = readFileSync(declaration, 'utf8');
const imports = [...source.matchAll(/(?:export|import)\s+(?:[^'";]+?\s+from\s+)?['"](\.\/[^'"]+)['"]/g)]
  .map((match) => match[1]);
const missing = [];

for (const specifier of imports) {
  const base = resolve(dirname(declaration), specifier);
  const candidates = [base, `${base}.d.ts`, resolve(base, 'index.d.ts')];
  if (!candidates.some((candidate) => existsSync(candidate))) {
    missing.push(specifier);
  }
}

if (missing.length > 0) {
  console.error(`Unresolved declaration exports in ${declaration}:`);
  for (const specifier of missing) console.error(`  - ${specifier}`);
  process.exit(1);
}

console.log(`Declaration verification passed (${imports.length} relative exports/imports).`);
