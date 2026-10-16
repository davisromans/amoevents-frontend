import * as fabric from 'fabric';

function makeMask(width, height) {
  const canvas = window.document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function imagePixels(fabricImage) {
  const element = fabricImage.getElement();
  const sourceWidth = element.naturalWidth || element.width;
  const sourceHeight = element.naturalHeight || element.height;
  const cropX = Math.max(0, Math.min(sourceWidth - 1, Math.round(fabricImage.cropX || 0)));
  const cropY = Math.max(0, Math.min(sourceHeight - 1, Math.round(fabricImage.cropY || 0)));
  const width = Math.max(1, Math.min(sourceWidth - cropX, Math.round(fabricImage.width || sourceWidth)));
  const height = Math.max(1, Math.min(sourceHeight - cropY, Math.round(fabricImage.height || sourceHeight)));
  const canvas = makeMask(width, height);
  canvas.getContext('2d').drawImage(element, cropX, cropY, width, height, 0, 0, width, height);
  return canvas;
}

export function cloneSelectionMask(source) {
  const output = makeMask(source.width, source.height);
  output.getContext('2d').drawImage(source, 0, 0);
  return output;
}

export function createFullSelection(fabricImage) {
  const source = imagePixels(fabricImage);
  const mask = makeMask(source.width, source.height);
  mask.getContext('2d').fillRect(0, 0, mask.width, mask.height);
  return { mask, width: mask.width, height: mask.height, count: mask.width * mask.height };
}

export function createRectangleSelection(width, height, start, end) {
  const mask = makeMask(width, height);
  const left = Math.max(0, Math.min(width, Math.floor(Math.min(start.x, end.x))));
  const top = Math.max(0, Math.min(height, Math.floor(Math.min(start.y, end.y))));
  const right = Math.max(0, Math.min(width, Math.ceil(Math.max(start.x, end.x))));
  const bottom = Math.max(0, Math.min(height, Math.ceil(Math.max(start.y, end.y))));
  if (right > left && bottom > top) mask.getContext('2d').fillRect(left, top, right - left, bottom - top);
  return { mask, width: mask.width, height: mask.height, count: Math.max(0, right - left) * Math.max(0, bottom - top) };
}

export function createPolygonSelection(width, height, points = []) {
  const mask = makeMask(width, height);
  if (points.length < 3) return { mask, width: mask.width, height: mask.height, count: 0 };
  const context = mask.getContext('2d');
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) context.lineTo(point.x, point.y);
  context.closePath();
  context.fill();
  return { mask, width: mask.width, height: mask.height, count: countSelectedPixels(mask) };
}

export function createColorRangeSelection(fabricImage, color, { tolerance = 32, includeTransparent = false } = {}) {
  const source = imagePixels(fabricImage);
  const pixels = source.getContext('2d').getImageData(0, 0, source.width, source.height).data;
  const rgba = new fabric.Color(color).getSource();
  const wanted = [rgba[0], rgba[1], rgba[2], Math.round((rgba[3] ?? 1) * 255)];
  const mask = makeMask(source.width, source.height);
  const context = mask.getContext('2d');
  const image = context.createImageData(mask.width, mask.height);
  let count = 0;
  for (let pixel = 0; pixel < source.width * source.height; pixel += 1) {
    const index = pixel * 4;
    const alpha = pixels[index + 3];
    const distance = Math.max(
      Math.abs(pixels[index] - wanted[0]), Math.abs(pixels[index + 1] - wanted[1]),
      Math.abs(pixels[index + 2] - wanted[2]), Math.abs(alpha - wanted[3]),
    );
    const selected = (includeTransparent || alpha > 0) && distance <= tolerance;
    image.data[index] = image.data[index + 1] = image.data[index + 2] = 255;
    image.data[index + 3] = selected ? 255 : 0;
    if (selected) count += 1;
  }
  context.putImageData(image, 0, 0);
  return { mask, width: mask.width, height: mask.height, count };
}

export function countSelectedPixels(mask) {
  const data = mask.getContext('2d').getImageData(0, 0, mask.width, mask.height).data;
  let count = 0;
  for (let index = 3; index < data.length; index += 4) if (data[index] >= 128) count += 1;
  return count;
}

export function invertSelection(mask) {
  const output = cloneSelectionMask(mask);
  const context = output.getContext('2d');
  const image = context.getImageData(0, 0, output.width, output.height);
  for (let index = 3; index < image.data.length; index += 4) image.data[index] = 255 - image.data[index];
  context.putImageData(image, 0, 0);
  return output;
}

function shiftedUnion(mask, radius) {
  const output = makeMask(mask.width, mask.height);
  const context = output.getContext('2d');
  for (let y = -radius; y <= radius; y += 1) {
    const horizontal = Math.floor(Math.sqrt(Math.max(0, radius * radius - y * y)));
    for (let x = -horizontal; x <= horizontal; x += 1) context.drawImage(mask, x, y);
  }
  return output;
}

export function modifySelection(mask, mode, amount = 1) {
  const radius = Math.max(1, Math.min(100, Math.round(amount)));
  if (mode === 'expand') return shiftedUnion(mask, radius);
  if (mode === 'contract') return invertSelection(shiftedUnion(invertSelection(mask), radius));
  if (mode === 'feather') {
    const output = makeMask(mask.width, mask.height);
    const context = output.getContext('2d');
    context.filter = `blur(${radius}px)`;
    context.drawImage(mask, 0, 0);
    context.filter = 'none';
    return output;
  }
  if (mode === 'smooth') {
    const softened = modifySelection(mask, 'feather', radius);
    const context = softened.getContext('2d');
    const image = context.getImageData(0, 0, softened.width, softened.height);
    for (let index = 3; index < image.data.length; index += 4) image.data[index] = image.data[index] >= 128 ? 255 : 0;
    context.putImageData(image, 0, 0);
    return softened;
  }
  if (mode === 'border') {
    const outer = shiftedUnion(mask, radius);
    const inner = modifySelection(mask, 'contract', radius);
    const context = outer.getContext('2d');
    context.globalCompositeOperation = 'destination-out';
    context.drawImage(inner, 0, 0);
    context.globalCompositeOperation = 'source-over';
    return outer;
  }
  return cloneSelectionMask(mask);
}

export function transformSelection(mask, { scaleX = 1, scaleY = 1, angle = 0, offsetX = 0, offsetY = 0 } = {}) {
  const output = makeMask(mask.width, mask.height);
  const context = output.getContext('2d');
  context.translate(mask.width / 2 + offsetX, mask.height / 2 + offsetY);
  context.rotate((Number(angle) || 0) * Math.PI / 180);
  context.scale(Number(scaleX) || 1, Number(scaleY) || 1);
  context.drawImage(mask, -mask.width / 2, -mask.height / 2);
  return output;
}

export function selectionEdgeCanvas(mask) {
  const width = mask.width, height = mask.height;
  const source = mask.getContext('2d').getImageData(0, 0, width, height).data;
  const output = makeMask(width, height);
  const context = output.getContext('2d');
  const image = context.createImageData(width, height);
  const selected = (x, y) => x >= 0 && y >= 0 && x < width && y < height && source[(y * width + x) * 4 + 3] >= 128;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    if (!selected(x, y)) continue;
    if (selected(x - 1, y) && selected(x + 1, y) && selected(x, y - 1) && selected(x, y + 1)) continue;
    const index = (y * width + x) * 4;
    const light = (x + y) % 8 < 4;
    image.data[index] = image.data[index + 1] = image.data[index + 2] = light ? 255 : 0;
    image.data[index + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  return output;
}

export function selectionToDataUrl(mask) { return mask.toDataURL('image/png'); }

export async function selectionFromDataUrl(dataUrl) {
  const image = await fabric.FabricImage.fromURL(dataUrl);
  const element = image.getElement();
  const output = makeMask(element.naturalWidth || element.width, element.naturalHeight || element.height);
  output.getContext('2d').drawImage(element, 0, 0);
  return output;
}
