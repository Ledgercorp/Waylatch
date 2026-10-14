import type { ResourceRequest } from './schema';
function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object')
    return (
      '{' +
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => JSON.stringify(key) + ':' + canonical(item))
        .join(',') +
      '}'
    );
  return JSON.stringify(value) ?? 'undefined';
}
/** Content comparison only; this does not authenticate either record. */
export function sameRequestSnapshot(left: ResourceRequest, right: ResourceRequest): boolean {
  return canonical(left) === canonical(right);
}
