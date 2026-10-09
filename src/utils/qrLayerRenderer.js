import QRCode from 'qrcode';
import * as fabric from 'fabric';

// Batch 22 — renders a real QR code image for the `qr` layer type,
// replacing the earlier placeholder box (Batch 2) now that there's an
// actual library wired in. In the Studio this always encodes sample text —
// the real per-guest payload (a signed JWT, same scheme qr.service.js
// already uses for the flat-image path) only gets generated at export
// time server-side (Batch 28), never in the editor.
export const DEFAULT_QR_LAYER_STYLE = Object.freeze({
  fg: '#111111', bg: '#FFFFFF', borderColor: '#111111', borderWidth: 0, borderRadius: 0,
  padding: 12, showTopLabel: true, showBottomLabel: true,
  topLabelColor: '#111111', bottomLabelColor: '#111111',
  topLabelFontFamily: 'Arial', bottomLabelFontFamily: 'Arial',
  topLabelFontWeight: 700, bottomLabelFontWeight: 700,
  topLabelFontSize: 28, bottomLabelFontSize: 28,
  topLabelLetterSpacing: 1, bottomLabelLetterSpacing: 1,
  topLabelOffsetX: 0, topLabelOffsetY: 0, bottomLabelOffsetX: 0, bottomLabelOffsetY: 0,
});

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, r);
}

export async function renderQrImage(options = {}) {
  const config = { ...DEFAULT_QR_LAYER_STYLE, ...options };
  const size = Number(config.size) || 512;
  const labelBand = Math.round(size * 0.16);
  const topBand = config.showTopLabel ? labelBand : 0;
  const bottomBand = config.showBottomLabel ? labelBand : 0;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size + topBand + bottomBand;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const inset = Math.max(0, Number(config.padding) || 0);
  const qrDataUrl = await QRCode.toDataURL(config.text || 'SAMPLE-QR-PAYLOAD', {
    color: { dark: config.fg, light: config.bg }, width: size - inset * 2, margin: 1,
    errorCorrectionLevel: config.errorCorrection || 'M',
  });
  const qr = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = qrDataUrl;
  });
  ctx.fillStyle = config.bg;
  roundedRect(ctx, 0, topBand, size, size, Number(config.borderRadius) || 0);
  ctx.fill();
  ctx.drawImage(qr, inset, topBand + inset, size - inset * 2, size - inset * 2);
  if (Number(config.borderWidth) > 0) {
    ctx.strokeStyle = config.borderColor;
    ctx.lineWidth = Number(config.borderWidth);
    roundedRect(ctx, ctx.lineWidth / 2, topBand + ctx.lineWidth / 2, size - ctx.lineWidth, size - ctx.lineWidth, Number(config.borderRadius) || 0);
    ctx.stroke();
  }
  const drawLabel = (text, y, prefix) => {
    ctx.fillStyle = config[`${prefix}LabelColor`];
    ctx.font = `${config[`${prefix}LabelFontStyle`] || 'normal'} ${config[`${prefix}LabelFontWeight`]} ${config[`${prefix}LabelFontSize`]}px ${config[`${prefix}LabelFontFamily`]}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const spacing = Number(config[`${prefix}LabelLetterSpacing`] || 0);
    const x = size / 2 + Number(config[`${prefix}LabelOffsetX`] || 0);
    const labelY = y + Number(config[`${prefix}LabelOffsetY`] || 0);
    if (!spacing) ctx.fillText(text, x, labelY);
    else {
      const chars = [...text];
      const widths = chars.map((char) => ctx.measureText(char).width);
      const total = widths.reduce((sum, width) => sum + width, 0) + spacing * Math.max(0, chars.length - 1);
      ctx.textAlign = 'left';
      let cursor = x - total / 2;
      chars.forEach((char, index) => { ctx.fillText(char, cursor, labelY); cursor += widths[index] + spacing; });
    }
  };
  if (config.showTopLabel) drawLabel(config.topLabelSample || 'AMO-A7X', topBand / 2, 'top');
  if (config.showBottomLabel) drawLabel(config.bottomLabelSample || 'DOUBLE', topBand + size + bottomBand / 2, 'bottom');
  return new fabric.FabricImage(canvas);
}
