// Turns a chosen photo into a JPEG data URL no larger than MAX px on its longest side,
// so uploads stay small (a few hundred KB) and the server only ever stores JPEGs.
const MAX = 1200;
const QUALITY = 0.88;

export async function toJpegDataUrl(file) {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
  let bitmap;
  try {
    bitmap = await createImageBitmap(file); // applies the photo's EXIF rotation
  } catch {
    throw new Error("That image couldn't be opened. Try a JPEG or PNG.");
  }
  const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; // transparent PNGs get a white background instead of black
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', QUALITY);
}
