import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { fromText, toText } from './codec';

export async function packetQrDataUri(bytes: Uint8Array): Promise<string> {
  return QRCode.toDataURL(toText(bytes), { errorCorrectionLevel: 'M', margin: 4, width: 600 });
}
/** Decode a user-provided image locally. Image bytes never leave this browser. */
export async function decodeQrImage(file: Blob): Promise<Uint8Array> {
  if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024)
    throw new Error('Upload an image no larger than 5 MB');
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width < 1 || bitmap.height < 1 || bitmap.width * bitmap.height > 16000000)
      throw new Error('Image dimensions exceed QR scanner limit');
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Image scanner unavailable');
    context.drawImage(bitmap, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const qr = jsQR(pixels.data, pixels.width, pixels.height);
    if (!qr) throw new Error('No readable QR code found');
    return fromText(qr.data);
  } finally {
    bitmap.close();
  }
}
