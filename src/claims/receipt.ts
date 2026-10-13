/** Hash exact local receipt bytes. The image is never uploaded or stored by this helper. */
export async function receiptDigest(file: Blob): Promise<string> {
  if (file.size < 1 || file.size > 5 * 1024 * 1024)
    throw new Error('Receipt must contain 1 byte to 5 MB');
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
