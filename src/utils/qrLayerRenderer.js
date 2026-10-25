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
  labelPlacement: 'outside',
  topLabelBackgroundEnabled: false, bottomLabelBackgroundEnabled: false,
  topLabelBackgroundColor: '#FFFFFF', bottomLabelBackgroundColor: '#FFFFFF',
  topLabelBackgroundOpacity: 1, bottomLabelBackgroundOpacity: 1,
  topLabelBackgroundPaddingX: 16, bottomLabelBackgroundPaddingX: 16,
  topLabelBackgroundPaddingY: 8, bottomLabelBackgroundPaddingY: 8,
  topLabelBackgroundRadius: 0, bottomLabelBackgroundRadius: 0,
});

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, r);
}

export async function renderQrImage(options = {}) {
  const config = { ...DEFAULT_QR_LAYER_STYLE, ...options };
  const size = Number(config.size) || 512;
  const labelsInside = config.labelPlacement === 'inside';
  const panelWidth = Math.max(64, Number(config.panelWidth) || size);
  const authoredScale = panelWidth / size;
  // The old fixed 16% band was smaller than an imported 80px status label.
  // It put "Single"/"Double" directly on the final QR row. Each label now
  // reserves its measured font height plus a deliberate clear gap.
  const labelBand = (prefix) => Math.ceil(Math.max(
    size * 0.16 * authoredScale,
    ((Number(config[`${prefix}LabelFontSize`]) || 28) + 24) * authoredScale,
  ));
  const topBand = config.showTopLabel ? labelBand('top') : 0;
  const bottomBand = config.showBottomLabel ? labelBand('bottom') : 0;
  const naturalHeight = labelsInside ? panelWidth : panelWidth + topBand + bottomBand;
  const panelHeight = Math.max(64, Number(config.panelHeight) || naturalHeight);
  const qrAreaHeight = Math.max(1, panelHeight - topBand - bottomBand);
  const qrSide = Math.max(1, Math.min(panelWidth, qrAreaHeight));
  const qrLeft = Math.round((panelWidth - qrSide) / 2);
  // Centre the square QR in the vertical area between its labels. The panel
  // may be portrait, but only the label area is allowed to be portrait.
  const qrTop = topBand + Math.max(0, Math.round((qrAreaHeight - qrSide) / 2));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(panelWidth);
  canvas.height = Math.round(panelHeight);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const inset = Math.max(0, (Number(config.padding) || 0) * authoredScale);
  const qrDataUrl = await QRCode.toDataURL(config.text || 'SAMPLE-QR-PAYLOAD', {
    color: { dark: config.fg, light: config.bg }, width: Math.max(1, Math.round(qrSide - inset * 2)), margin: 1,
    errorCorrectionLevel: config.errorCorrection || 'M',
  });
  const qr = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = qrDataUrl;
  });
  ctx.fillStyle = config.bg;
  roundedRect(ctx, 0, labelsInside ? 0 : topBand, panelWidth, labelsInside ? panelHeight : qrSide, (Number(config.borderRadius) || 0) * authoredScale);
  ctx.fill();
  ctx.drawImage(qr, qrLeft + inset, qrTop + inset, Math.max(1, qrSide - inset * 2), Math.max(1, qrSide - inset * 2));
  if (Number(config.borderWidth) > 0) {
    ctx.strokeStyle = config.borderColor;
    ctx.lineWidth = Number(config.borderWidth);
    roundedRect(ctx, ctx.lineWidth / 2, (labelsInside ? 0 : topBand) + ctx.lineWidth / 2, panelWidth - ctx.lineWidth, (labelsInside ? panelHeight : qrSide) - ctx.lineWidth, (Number(config.borderRadius) || 0) * authoredScale);
    ctx.stroke();
  }
  const drawLabel = (text, y, prefix) => {
    ctx.fillStyle = config[`${prefix}LabelColor`];
    const fontSize = (Number(config[`${prefix}LabelFontSize`]) || 28) * authoredScale;
    ctx.font = `${config[`${prefix}LabelFontStyle`] || 'normal'} ${config[`${prefix}LabelFontWeight`]} ${fontSize}px ${config[`${prefix}LabelFontFamily`]}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const spacing = Number(config[`${prefix}LabelLetterSpacing`] || 0) * authoredScale;
    const x = panelWidth / 2 + Number(config[`${prefix}LabelOffsetX`] || 0) * authoredScale;
    const labelY = y + Number(config[`${prefix}LabelOffsetY`] || 0) * authoredScale;
    const chars = [...text];
    const widths = chars.map((char) => ctx.measureText(char).width);
    const total = widths.reduce((sum, width) => sum + width, 0) + spacing * Math.max(0, chars.length - 1);
    if (config[`${prefix}LabelBackgroundEnabled`]) {
      const padX = Math.max(0, Number(config[`${prefix}LabelBackgroundPaddingX`]) || 0) * authoredScale;
      const padY = Math.max(0, Number(config[`${prefix}LabelBackgroundPaddingY`]) || 0) * authoredScale;
      const alpha = Math.max(0, Math.min(1, Number(config[`${prefix}LabelBackgroundOpacity`]) ?? 1));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = config[`${prefix}LabelBackgroundColor`] || '#FFFFFF';
      roundedRect(ctx, x - total / 2 - padX, labelY - fontSize / 2 - padY, total + padX * 2, fontSize + padY * 2, (Number(config[`${prefix}LabelBackgroundRadius`]) || 0) * authoredScale);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = config[`${prefix}LabelColor`];
    }
    if (!spacing) ctx.fillText(text, x, labelY);
    else {
      ctx.textAlign = 'left';
      let cursor = x - total / 2;
      chars.forEach((char, index) => { ctx.fillText(char, cursor, labelY); cursor += widths[index] + spacing; });
    }
  };
  if (config.showTopLabel) drawLabel(config.topLabelSample || 'AMO-A7X', topBand / 2, 'top');
  // For inside labels the lower band starts *after* the QR area. The prior
  // subtraction centred status text on the final QR modules.
  if (config.showBottomLabel) drawLabel(String(config.bottomLabelSample || 'DOUBLE').toUpperCase(), labelsInside ? topBand + qrAreaHeight + bottomBand / 2 : topBand + qrSide + bottomBand / 2, 'bottom');
  return new fabric.FabricImage(canvas);
}
