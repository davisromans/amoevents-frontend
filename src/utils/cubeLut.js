const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(String(value || ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function parseCubeLut(text, { maxSize = 64 } = {}) {
  let title = 'Colour Lookup';
  let size = 0;
  let domainMin = [0, 0, 0];
  let domainMax = [1, 1, 1];
  const samples = [];

  for (const rawLine of String(text || '').split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, '').trim();
    if (!line) continue;
    const titleMatch = line.match(/^TITLE\s+"?(.+?)"?$/i);
    if (titleMatch) { title = titleMatch[1]; continue; }
    const sizeMatch = line.match(/^LUT_3D_SIZE\s+(\d+)$/i);
    if (sizeMatch) { size = Number(sizeMatch[1]); continue; }
    const minMatch = line.match(/^DOMAIN_MIN\s+([\d.e+-]+)\s+([\d.e+-]+)\s+([\d.e+-]+)$/i);
    if (minMatch) { domainMin = minMatch.slice(1).map(Number); continue; }
    const maxMatch = line.match(/^DOMAIN_MAX\s+([\d.e+-]+)\s+([\d.e+-]+)\s+([\d.e+-]+)$/i);
    if (maxMatch) { domainMax = maxMatch.slice(1).map(Number); continue; }
    if (/^[A-Z_]+/i.test(line)) continue;
    const values = line.split(/\s+/).slice(0, 3).map(Number);
    if (values.length === 3 && values.every(Number.isFinite)) samples.push(...values.map((value) => clamp(value)));
  }

  if (!Number.isInteger(size) || size < 2 || size > maxSize) throw new Error(`3D LUT size must be between 2 and ${maxSize}.`);
  const expected = size ** 3 * 3;
  if (samples.length !== expected) throw new Error(`This LUT declares ${size}³ but contains ${samples.length / 3} colour entries; expected ${size ** 3}.`);

  const packed = new Uint8Array(expected * 2);
  const view = new DataView(packed.buffer);
  samples.forEach((value, index) => view.setUint16(index * 2, Math.round(clamp(value) * 65535), true));
  return {
    kind: 'cube3d', title, size, domainMin, domainMax,
    encoding: 'u16le-base64', data: bytesToBase64(packed),
  };
}

export function decodeCubeLut(lut) {
  if (!lut || lut.kind !== 'cube3d' || !Number.isInteger(Number(lut.size))) return null;
  if (lut.__decoded instanceof Float32Array) return lut.__decoded;
  const bytes = base64ToBytes(lut.data);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const values = new Float32Array(bytes.byteLength / 2);
  for (let index = 0; index < values.length; index += 1) values[index] = view.getUint16(index * 2, true) / 65535;
  try { Object.defineProperty(lut, '__decoded', { value: values, configurable: true }); } catch (_) { /* frozen document snapshot */ }
  return values;
}

export function sampleCubeLut(lut, red, green, blue) {
  const data = decodeCubeLut(lut);
  if (!data) return [red, green, blue];
  const size = Number(lut.size);
  const input = [red, green, blue];
  const min = lut.domainMin || [0, 0, 0], max = lut.domainMax || [1, 1, 1];
  const axis = input.map((value, channel) => clamp((value - Number(min[channel] || 0)) / Math.max(1e-8, Number(max[channel] ?? 1) - Number(min[channel] || 0))) * (size - 1));
  const low = axis.map(Math.floor), high = axis.map((value) => Math.min(size - 1, Math.ceil(value))), mix = axis.map((value, channel) => value - low[channel]);
  const entry = (r, g, b, channel) => data[((b * size * size + g * size + r) * 3) + channel] || 0;
  const output = [];
  for (let channel = 0; channel < 3; channel += 1) {
    const c000 = entry(low[0], low[1], low[2], channel), c100 = entry(high[0], low[1], low[2], channel);
    const c010 = entry(low[0], high[1], low[2], channel), c110 = entry(high[0], high[1], low[2], channel);
    const c001 = entry(low[0], low[1], high[2], channel), c101 = entry(high[0], low[1], high[2], channel);
    const c011 = entry(low[0], high[1], high[2], channel), c111 = entry(high[0], high[1], high[2], channel);
    const c00 = c000 + (c100 - c000) * mix[0], c10 = c010 + (c110 - c010) * mix[0];
    const c01 = c001 + (c101 - c001) * mix[0], c11 = c011 + (c111 - c011) * mix[0];
    const c0 = c00 + (c10 - c00) * mix[1], c1 = c01 + (c11 - c01) * mix[1];
    output[channel] = c0 + (c1 - c0) * mix[2];
  }
  return output;
}
