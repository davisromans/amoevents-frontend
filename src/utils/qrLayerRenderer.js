import QRCode from 'qrcode';
import * as fabric from 'fabric';

// Batch 22 — renders a real QR code image for the `qr` layer type,
// replacing the earlier placeholder box (Batch 2) now that there's an
// actual library wired in. In the Studio this always encodes sample text —
// the real per-guest payload (a signed JWT, same scheme qr.service.js
// already uses for the flat-image path) only gets generated at export
// time server-side (Batch 28), never in the editor.
export async function renderQrImage({ text = 'SAMPLE-QR-PAYLOAD', fg = '#000000', bg = '#FFFFFF', size = 256 } = {}) {
  const dataUrl = await QRCode.toDataURL(text, { color: { dark: fg, light: bg }, width: size, margin: 1 });
  return fabric.FabricImage.fromURL(dataUrl);
}
