import { describe, expect, it } from 'vitest';
import { receiptDigest } from '../src/claims/receipt';
describe('local receipt evidence', () => {
  it('hashes exact file bytes without uploading', async () => {
    expect(await receiptDigest(new Blob(['abc']))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
  it('rejects empty or oversized receipt files', async () => {
    await expect(receiptDigest(new Blob([]))).rejects.toThrow();
    await expect(receiptDigest(new Blob([new Uint8Array(5 * 1024 * 1024 + 1)]))).rejects.toThrow();
  });
});
