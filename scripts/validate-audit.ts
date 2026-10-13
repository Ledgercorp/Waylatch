import { readFileSync } from 'node:fs';
import { validateChain } from '../src/audit/chain';
const path = process.argv[2];
if (!path) throw new Error('Usage: npm run audit:validate -- exported-audit.json');
const result = validateChain(JSON.parse(readFileSync(path, 'utf8')));
console.log(JSON.stringify(result));
if (!result.valid) process.exitCode = 1;
