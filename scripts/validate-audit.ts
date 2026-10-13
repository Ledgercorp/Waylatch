import { readFileSync } from 'node:fs';
import { validateChain } from '../src/audit/chain';
import { z } from 'zod';
const path = process.argv[2];
if (!path) throw new Error('Usage: npm run audit:validate -- exported-audit.json');
try {
  const exported: unknown = JSON.parse(readFileSync(path, 'utf8'));
  const candidate = Array.isArray(exported)
    ? exported
    : z.object({ events: z.array(z.unknown()) }).parse(exported).events;
  const events = z
    .array(
      z.strictObject({
        seq: z.number().int().positive(),
        at: z.string(),
        type: z.string(),
        recordId: z.string().nullable(),
        data: z.unknown(),
        previous: z.string().regex(/^[a-f0-9]{64}$/),
        hash: z.string().regex(/^[a-f0-9]{64}$/),
      }),
    )
    .parse(candidate);
  const result = validateChain(events);
  console.log(JSON.stringify(result));
  if (!result.valid) process.exitCode = 1;
} catch {
  console.log(JSON.stringify({ valid: false, code: 'AUDIT_EXPORT_INVALID' }));
  process.exitCode = 1;
}
