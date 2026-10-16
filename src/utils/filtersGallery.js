import * as fabric from 'fabric';

// Batch 16 — filters gallery for image layers. Fabric ships a genuinely
// solid native set already (Blur, Noise, Pixelate — used as-is below);
// Sharpen/Emboss/Find-edges are convolution kernels, which Fabric's
// `Convolute` filter runs natively once given the right 3×3 matrix — these
// are the same classic kernels every raster editor uses under the hood,
// not an approximation. `Twirl` is the one genuinely custom filter here:
// Fabric has no geometric-distortion filter built in, so it's written as
// a real WebGL fragment shader subclassing Fabric's BaseFilter.
//
// Ripple, Pinch and Spherize use the same CPU/WebGL-safe radial remapping
// contract below so preview and saved server output stay aligned.

const KERNELS = {
  sharpen: [0, -1, 0, -1, 5, -1, 0, -1, 0],
  unsharpMask: [-1, -1, -1, -1, 9, -1, -1, -1, -1],
  smartSharpen: [0, -1, 0, -1, 6, -1, 0, -1, 0],
  emboss: [-2, -1, 0, -1, 1, 1, 0, 1, 2],
  findEdges: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
};

// A real custom WebGL filter — Fabric filters are normally per-pixel color
// transforms; this one remaps WHERE each output pixel samples from from
// the source texture, which is what makes it a geometric distortion
// rather than a color adjustment.
class TwirlFilter extends fabric.filters.BaseFilter {
  static type = 'Twirl';
  static defaults = { angle: 2 };

  getFragmentSource() {
    return `
      precision highp float;
      uniform sampler2D uTexture;
      uniform float uAngle;
      varying vec2 vTexCoord;
      void main() {
        vec2 center = vec2(0.5, 0.5);
        vec2 toCenter = vTexCoord - center;
        float dist = length(toCenter);
        float rotation = uAngle * (1.0 - smoothstep(0.0, 0.5, dist));
        float s = sin(rotation), c = cos(rotation);
        vec2 rotated = vec2(toCenter.x * c - toCenter.y * s, toCenter.x * s + toCenter.y * c);
        gl_FragColor = texture2D(uTexture, center + rotated);
      }
    `;
  }
  getUniformLocations(gl, program) {
    return { uAngle: gl.getUniformLocation(program, 'uAngle') };
  }
  sendUniformData(gl, uniformLocations) {
    gl.uniform1f(uniformLocations.uAngle, this.angle);
  }
  applyTo2d({ imageData }) {
    const { width, height, data } = imageData;
    const source = new Uint8ClampedArray(data);
    const cx = (width - 1) / 2, cy = (height - 1) / 2;
    const radius = Math.max(1, Math.min(width, height) / 2);
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      const dx = x - cx, dy = y - cy;
      const distance = Math.hypot(dx, dy);
      if (distance >= radius) continue;
      const t = 1 - distance / radius;
      const rotation = -Number(this.angle || 0) * t * t;
      const sin = Math.sin(rotation), cos = Math.cos(rotation);
      const sx = Math.round(cx + dx * cos - dy * sin);
      const sy = Math.round(cy + dx * sin + dy * cos);
      const target = (y * width + x) * 4;
      const sample = (Math.max(0, Math.min(height - 1, sy)) * width + Math.max(0, Math.min(width - 1, sx))) * 4;
      data[target] = source[sample]; data[target + 1] = source[sample + 1];
      data[target + 2] = source[sample + 2]; data[target + 3] = source[sample + 3];
    }
  }
}
fabric.classRegistry.setClass(TwirlFilter, 'Twirl');

class PosterizeFilter extends fabric.filters.BaseFilter {
  static type = 'Posterize'; static defaults = { levels: 6 };
  getFragmentSource() { return `precision highp float; uniform sampler2D uTexture; uniform float uLevels; varying vec2 vTexCoord; void main(){ vec4 c=texture2D(uTexture,vTexCoord); c.rgb=floor(c.rgb*(uLevels-1.0)+0.5)/(uLevels-1.0); gl_FragColor=c; }`; }
  getUniformLocations(gl, program) { return { uLevels: gl.getUniformLocation(program, 'uLevels') }; }
  sendUniformData(gl, u) { gl.uniform1f(u.uLevels, Math.max(2, Number(this.levels) || 6)); }
  applyTo2d({ imageData }) { const levels = Math.max(2, Number(this.levels) || 6), step = 255 / (levels - 1); for (let i = 0; i < imageData.data.length; i += 4) for (let c = 0; c < 3; c += 1) imageData.data[i + c] = Math.round(imageData.data[i + c] / step) * step; }
}
class ThresholdFilter extends fabric.filters.BaseFilter {
  static type = 'Threshold'; static defaults = { threshold: 128 };
  getFragmentSource() { return `precision highp float; uniform sampler2D uTexture; uniform float uThreshold; varying vec2 vTexCoord; void main(){ vec4 c=texture2D(uTexture,vTexCoord); float y=dot(c.rgb,vec3(.299,.587,.114)); float v=step(uThreshold,y); gl_FragColor=vec4(vec3(v),c.a); }`; }
  getUniformLocations(gl, program) { return { uThreshold: gl.getUniformLocation(program, 'uThreshold') }; }
  sendUniformData(gl, u) { gl.uniform1f(u.uThreshold, Math.max(0, Math.min(255, Number(this.threshold) || 128)) / 255); }
  applyTo2d({ imageData }) { const t = Number(this.threshold) || 128, d = imageData.data; for (let i = 0; i < d.length; i += 4) { const v = d[i] * .299 + d[i + 1] * .587 + d[i + 2] * .114 >= t ? 255 : 0; d[i] = d[i + 1] = d[i + 2] = v; } }
}
class RadialDistortFilter extends fabric.filters.BaseFilter {
  static type = 'RadialDistort'; static defaults = { mode: 'pinch', amount: 0.35 };
  getFragmentSource() { return `precision highp float; uniform sampler2D uTexture; uniform float uAmount; uniform float uMode; varying vec2 vTexCoord; void main(){ vec2 p=vTexCoord-.5; float r=length(p); vec2 uv=vTexCoord; if(r<.5){ if(uMode<.5){ float wave=sin(r*70.0)*uAmount*(.5-r); uv=.5+p*(1.0+wave); } else { float k=uMode<1.5 ? (1.0+uAmount*(1.0-r*2.0)) : (1.0-uAmount*(1.0-r*2.0)); uv=.5+p*k; } } gl_FragColor=texture2D(uTexture,clamp(uv,0.0,1.0)); }`; }
  getUniformLocations(gl, program) { return { uAmount: gl.getUniformLocation(program, 'uAmount'), uMode: gl.getUniformLocation(program, 'uMode') }; }
  sendUniformData(gl, u) { gl.uniform1f(u.uAmount, Number(this.amount) || 0); gl.uniform1f(u.uMode, this.mode === 'ripple' ? 0 : this.mode === 'pinch' ? 1 : 2); }
  applyTo2d({ imageData }) {
    const { width, height, data } = imageData, source = new Uint8ClampedArray(data), cx = (width - 1) / 2, cy = (height - 1) / 2, radius = Math.max(1, Math.min(width, height) / 2), amount = Number(this.amount) || 0;
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) { const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy); if (r >= radius) continue; const n = r / radius; let k; if (this.mode === 'ripple') k = 1 + Math.sin(n * 35) * amount * (1 - n); else if (this.mode === 'pinch') k = 1 + amount * (1 - n); else k = 1 - amount * (1 - n); const sx = Math.max(0, Math.min(width - 1, Math.round(cx + dx * k))), sy = Math.max(0, Math.min(height - 1, Math.round(cy + dy * k))), a = (y * width + x) * 4, b = (sy * width + sx) * 4; data[a] = source[b]; data[a + 1] = source[b + 1]; data[a + 2] = source[b + 2]; data[a + 3] = source[b + 3]; }
  }
}
class RadialBlurFilter extends fabric.filters.BaseFilter {
  static type = 'RadialBlur'; static defaults = { amount: 0.18 };
  getFragmentSource() { return `precision highp float; uniform sampler2D uTexture; uniform float uAmount; varying vec2 vTexCoord; void main(){ vec2 d=(vec2(.5)-vTexCoord)*uAmount; vec4 c=vec4(0.0); for(int i=0;i<9;i++){ c+=texture2D(uTexture,clamp(vTexCoord+d*(float(i)/8.0),0.0,1.0)); } gl_FragColor=c/9.0; }`; }
  getUniformLocations(gl, program) { return { uAmount: gl.getUniformLocation(program, 'uAmount') }; } sendUniformData(gl, u) { gl.uniform1f(u.uAmount, Number(this.amount) || 0); }
  applyTo2d({ imageData }) { const { width, height, data } = imageData, src = new Uint8ClampedArray(data), amount = Number(this.amount) || 0, cx = width / 2, cy = height / 2; for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) { const out = (y * width + x) * 4, sum = [0, 0, 0, 0]; for (let s = 0; s < 9; s += 1) { const t = amount * s / 8, sx = Math.max(0, Math.min(width - 1, Math.round(x + (cx - x) * t))), sy = Math.max(0, Math.min(height - 1, Math.round(y + (cy - y) * t))), i = (sy * width + sx) * 4; for (let c = 0; c < 4; c += 1) sum[c] += src[i + c]; } for (let c = 0; c < 4; c += 1) data[out + c] = sum[c] / 9; } }
}
class OilPaintFilter extends fabric.filters.BaseFilter {
  static type = 'OilPaint'; static defaults = { levels: 12 };
  getFragmentSource() { return `precision highp float; uniform sampler2D uTexture; varying vec2 vTexCoord; void main(){ vec4 c=texture2D(uTexture,vTexCoord)*.4; c+=texture2D(uTexture,vTexCoord+vec2(.002,0.0))*.15; c+=texture2D(uTexture,vTexCoord-vec2(.002,0.0))*.15; c+=texture2D(uTexture,vTexCoord+vec2(0.0,.002))*.15; c+=texture2D(uTexture,vTexCoord-vec2(0.0,.002))*.15; c.rgb=floor(c.rgb*11.0+.5)/11.0; gl_FragColor=c; }`; }
  applyTo2d({ imageData }) { const { width, height, data } = imageData, src = new Uint8ClampedArray(data), step = 255 / 11; for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) { const out = (y * width + x) * 4; for (let c = 0; c < 3; c += 1) { let sum = 0, count = 0; for (let oy = -1; oy <= 1; oy += 1) for (let ox = -1; ox <= 1; ox += 1) { const sx = Math.max(0, Math.min(width - 1, x + ox)), sy = Math.max(0, Math.min(height - 1, y + oy)); sum += src[(sy * width + sx) * 4 + c]; count += 1; } data[out + c] = Math.round((sum / count) / step) * step; } } }
}
class MotionBlurFilter extends fabric.filters.BaseFilter {
  static type = 'MotionBlur';
  static defaults = { amount: 0.03, angle: 0 };
  getFragmentSource() { return `precision highp float; uniform sampler2D uTexture; uniform vec2 uDirection; varying vec2 vTexCoord; void main(){ vec4 c=vec4(0.0); for(int i=0;i<9;i++){ float t=(float(i)-4.0)/4.0; c+=texture2D(uTexture,clamp(vTexCoord+uDirection*t,0.0,1.0)); } gl_FragColor=c/9.0; }`; }
  getUniformLocations(gl, program) { return { uDirection: gl.getUniformLocation(program, 'uDirection') }; }
  sendUniformData(gl, uniforms) {
    const radians = Number(this.angle || 0) * Math.PI / 180;
    const amount = Math.max(0, Math.min(0.25, Number(this.amount) || 0));
    gl.uniform2fv(uniforms.uDirection, new Float32Array([Math.cos(radians) * amount, Math.sin(radians) * amount]));
  }
  applyTo2d({ imageData }) {
    const { width, height, data } = imageData;
    const source = new Uint8ClampedArray(data);
    const radians = Number(this.angle || 0) * Math.PI / 180;
    const distance = Math.max(0, Math.min(0.25, Number(this.amount) || 0)) * Math.max(width, height);
    const dx = Math.cos(radians) * distance, dy = Math.sin(radians) * distance;
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      const output = (y * width + x) * 4;
      const sums = [0, 0, 0, 0];
      for (let sample = 0; sample < 9; sample += 1) {
        const t = (sample - 4) / 4;
        const sx = Math.max(0, Math.min(width - 1, Math.round(x + dx * t)));
        const sy = Math.max(0, Math.min(height - 1, Math.round(y + dy * t)));
        const input = (sy * width + sx) * 4;
        for (let channel = 0; channel < 4; channel += 1) sums[channel] += source[input + channel];
      }
      for (let channel = 0; channel < 4; channel += 1) data[output + channel] = sums[channel] / 9;
    }
  }
}
class GradientMapFilter extends fabric.filters.BaseFilter {
  static type = 'GradientMap';
  static defaults = { from: '#111827', to: '#D9B45E' };
  getFragmentSource() { return `precision highp float; uniform sampler2D uTexture; uniform vec3 uFrom; uniform vec3 uTo; varying vec2 vTexCoord; void main(){ vec4 c=texture2D(uTexture,vTexCoord); float y=dot(c.rgb,vec3(.299,.587,.114)); gl_FragColor=vec4(mix(uFrom,uTo,y),c.a); }`; }
  getUniformLocations(gl, program) { return { uFrom: gl.getUniformLocation(program, 'uFrom'), uTo: gl.getUniformLocation(program, 'uTo') }; }
  sendUniformData(gl, uniforms) {
    const parse = (hex) => { const source = new fabric.Color(hex).getSource(); return new Float32Array([source[0] / 255, source[1] / 255, source[2] / 255]); };
    gl.uniform3fv(uniforms.uFrom, parse(this.from)); gl.uniform3fv(uniforms.uTo, parse(this.to));
  }
  applyTo2d({ imageData }) {
    const d = imageData.data;
    const parse = (color) => new fabric.Color(color).getSource().slice(0, 3);
    const lo = parse(this.from), hi = parse(this.to);
    for (let i = 0; i < d.length; i += 4) { const y = (d[i] * .299 + d[i + 1] * .587 + d[i + 2] * .114) / 255; for (let c = 0; c < 3; c += 1) d[i + c] = lo[c] + (hi[c] - lo[c]) * y; }
  }
}
class GradientOverlayFilter extends fabric.filters.BaseFilter {
  static type = 'GradientOverlay';
  static defaults = { from: '#8B5CF6', to: '#D9B45E', opacity: 1, angle: 0 };
  getFragmentSource() { return `precision highp float; uniform sampler2D uTexture; uniform vec3 uFrom; uniform vec3 uTo; uniform float uOpacity; uniform vec2 uDirection; varying vec2 vTexCoord; void main(){ vec4 c=texture2D(uTexture,vTexCoord); float extent=max(abs(uDirection.x)+abs(uDirection.y),0.0001); float t=clamp(0.5+dot(vTexCoord-vec2(0.5),uDirection)/extent,0.0,1.0); vec3 overlay=mix(uFrom,uTo,t); gl_FragColor=vec4(mix(c.rgb,overlay,uOpacity),c.a); }`; }
  getUniformLocations(gl, program) { return { uFrom: gl.getUniformLocation(program, 'uFrom'), uTo: gl.getUniformLocation(program, 'uTo'), uOpacity: gl.getUniformLocation(program, 'uOpacity'), uDirection: gl.getUniformLocation(program, 'uDirection') }; }
  sendUniformData(gl, uniforms) {
    const parse = (color) => new Float32Array(new fabric.Color(color).getSource().slice(0, 3).map((value) => value / 255));
    const radians = Number(this.angle || 0) * Math.PI / 180;
    gl.uniform3fv(uniforms.uFrom, parse(this.from)); gl.uniform3fv(uniforms.uTo, parse(this.to));
    gl.uniform1f(uniforms.uOpacity, Math.max(0, Math.min(1, Number(this.opacity ?? 1))));
    gl.uniform2fv(uniforms.uDirection, new Float32Array([Math.cos(radians), Math.sin(radians)]));
  }
  applyTo2d({ imageData }) {
    const { width, height, data } = imageData;
    const from = new fabric.Color(this.from).getSource(), to = new fabric.Color(this.to).getSource();
    const opacity = Math.max(0, Math.min(1, Number(this.opacity ?? 1)));
    const radians = Number(this.angle || 0) * Math.PI / 180;
    const dx = Math.cos(radians), dy = Math.sin(radians), extent = Math.max(0.0001, Math.abs(dx) + Math.abs(dy));
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      const px = width > 1 ? x / (width - 1) : 0.5, py = height > 1 ? y / (height - 1) : 0.5;
      const t = Math.max(0, Math.min(1, 0.5 + ((px - 0.5) * dx + (py - 0.5) * dy) / extent));
      const index = (y * width + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        const overlay = from[channel] + (to[channel] - from[channel]) * t;
        data[index + channel] = data[index + channel] * (1 - opacity) + overlay * opacity;
      }
    }
  }
}
class ReplaceColorFilter extends fabric.filters.BaseFilter {
  static type = 'ReplaceColor'; static defaults = { from: '#ffffff', to: '#D9B45E', tolerance: 40 };
  getFragmentSource() { return `precision highp float; uniform sampler2D uTexture; uniform vec3 uFrom; uniform vec3 uTo; uniform float uTolerance; varying vec2 vTexCoord; void main(){ vec4 c=texture2D(uTexture,vTexCoord); if(distance(c.rgb,uFrom)<=uTolerance)c.rgb=uTo; gl_FragColor=c; }`; }
  getUniformLocations(gl, program) { return { uFrom: gl.getUniformLocation(program, 'uFrom'), uTo: gl.getUniformLocation(program, 'uTo'), uTolerance: gl.getUniformLocation(program, 'uTolerance') }; }
  sendUniformData(gl, u) { const parse = (color) => { const source = new fabric.Color(color).getSource(); return new Float32Array(source.slice(0, 3).map((value) => value / 255)); }; gl.uniform3fv(u.uFrom, parse(this.from)); gl.uniform3fv(u.uTo, parse(this.to)); gl.uniform1f(u.uTolerance, (Number(this.tolerance) || 40) / 255); }
  applyTo2d({ imageData }) { const parse = (color) => new fabric.Color(color).getSource().slice(0, 3), from = parse(this.from), to = parse(this.to), d = imageData.data, tolerance = Number(this.tolerance) || 40; for (let i = 0; i < d.length; i += 4) if (Math.hypot(d[i] - from[0], d[i + 1] - from[1], d[i + 2] - from[2]) <= tolerance) { d[i] = to[0]; d[i + 1] = to[1]; d[i + 2] = to[2]; } }
}
fabric.classRegistry.setClass(PosterizeFilter, 'Posterize'); fabric.classRegistry.setClass(ThresholdFilter, 'Threshold'); fabric.classRegistry.setClass(RadialDistortFilter, 'RadialDistort'); fabric.classRegistry.setClass(RadialBlurFilter, 'RadialBlur'); fabric.classRegistry.setClass(OilPaintFilter, 'OilPaint'); fabric.classRegistry.setClass(MotionBlurFilter, 'MotionBlur'); fabric.classRegistry.setClass(GradientMapFilter, 'GradientMap'); fabric.classRegistry.setClass(GradientOverlayFilter, 'GradientOverlay'); fabric.classRegistry.setClass(ReplaceColorFilter, 'ReplaceColor');

// The gallery — id, label, and a factory returning a Fabric filter
// instance for the given params. `params` are exposed to the UI as
// simple 0-1 sliders wherever a filter takes one continuous parameter.
export const FILTER_GALLERY = [
  { id: 'blur', label: 'Blur', param: { key: 'blur', min: 0, max: 1, default: 0.1 }, make: (v) => new fabric.filters.Blur({ blur: v }) },
  { id: 'sharpen', label: 'Sharpen', param: null, make: () => new fabric.filters.Convolute({ matrix: KERNELS.sharpen }) },
  { id: 'unsharpMask', label: 'Unsharp Mask', param: null, make: () => new fabric.filters.Convolute({ matrix: KERNELS.unsharpMask }) },
  { id: 'smartSharpen', label: 'Smart Sharpen', param: null, make: () => new fabric.filters.Convolute({ matrix: KERNELS.smartSharpen }) },
  { id: 'motionBlur', label: 'Motion Blur', param: { key: 'settings' }, panel: false, make: (value) => new MotionBlurFilter(typeof value === 'object' ? value : {}) },
  { id: 'lensBlur', label: 'Lens Blur', param: { key: 'blur', min: 0, max: 1, default: 0.18 }, make: (v) => new fabric.filters.Blur({ blur: v }) },
  { id: 'radialBlur', label: 'Radial Blur', param: { key: 'amount', min: 0, max: 0.8, default: 0.18 }, make: (v) => new RadialBlurFilter({ amount: v }) },
  { id: 'oilPaint', label: 'Oil Paint', param: null, make: () => new OilPaintFilter() },
  { id: 'gradientMap', label: 'Gradient Map', param: { key: 'settings' }, panel: false, make: (value) => new GradientMapFilter(typeof value === 'object' ? value : {}) },
  { id: 'replaceColor', label: 'Replace Color', param: { key: 'settings' }, panel: false, make: (v) => new ReplaceColorFilter(v || {}) },
  { id: 'noise', label: 'Noise', param: { key: 'noise', min: 0, max: 400, default: 60 }, make: (v) => new fabric.filters.Noise({ noise: v }) },
  { id: 'pixelate', label: 'Pixelate', param: { key: 'blocksize', min: 1, max: 40, default: 8 }, make: (v) => new fabric.filters.Pixelate({ blocksize: v }) },
  { id: 'emboss', label: 'Emboss', param: null, make: () => new fabric.filters.Convolute({ matrix: KERNELS.emboss }) },
  { id: 'findEdges', label: 'Find edges', param: null, make: () => new fabric.filters.Convolute({ matrix: KERNELS.findEdges }) },
  { id: 'twirl', label: 'Twirl (distort)', param: { key: 'angle', min: -6, max: 6, default: 2 }, make: (v) => new TwirlFilter({ angle: v }) },
  { id: 'posterize', label: 'Posterize', param: { key: 'levels', min: 2, max: 32, default: 6 }, make: (v) => new PosterizeFilter({ levels: v }) },
  { id: 'threshold', label: 'Threshold', param: { key: 'threshold', min: 0, max: 255, default: 128 }, make: (v) => new ThresholdFilter({ threshold: v }) },
  { id: 'ripple', label: 'Ripple', param: { key: 'amount', min: -1, max: 1, default: 0.25 }, make: (v) => new RadialDistortFilter({ mode: 'ripple', amount: v }) },
  { id: 'pinch', label: 'Pinch', param: { key: 'amount', min: -1, max: 1, default: 0.35 }, make: (v) => new RadialDistortFilter({ mode: 'pinch', amount: v }) },
  { id: 'spherize', label: 'Spherize', param: { key: 'amount', min: -1, max: 1, default: 0.35 }, make: (v) => new RadialDistortFilter({ mode: 'spherize', amount: v }) },
  // One-click adjustments (Image > Adjustments) and photo looks. Keep this
  // list in sync with cardRenderer.service.js's GALLERY_FILTERS so the final
  // printed card matches the editor.
  { id: 'invert', label: 'Invert', param: null, make: () => new fabric.filters.Invert() },
  { id: 'grayscale', label: 'Desaturate', param: null, make: () => new fabric.filters.Grayscale() },
  { id: 'blackWhite', label: 'Black & White', param: null, make: () => new fabric.filters.BlackWhite() },
  { id: 'sepia', label: 'Sepia', param: null, make: () => new fabric.filters.Sepia() },
  { id: 'vibrance', label: 'Vibrance', param: { key: 'vibrance', min: -1, max: 1, default: 0.3 }, make: (v) => new fabric.filters.Vibrance({ vibrance: v }) },
  { id: 'gamma', label: 'Gamma', param: { key: 'gamma', min: 0.2, max: 2.2, default: 1 }, make: (v) => new fabric.filters.Gamma({ gamma: [v, v, v] }) },
  { id: 'vintage', label: 'Vintage', param: null, make: () => new fabric.filters.Vintage() },
  { id: 'kodachrome', label: 'Kodachrome', param: null, make: () => new fabric.filters.Kodachrome() },
  { id: 'technicolor', label: 'Technicolor', param: null, make: () => new fabric.filters.Technicolor() },
  { id: 'polaroid', label: 'Polaroid', param: null, make: () => new fabric.filters.Polaroid() },
  { id: 'brownie', label: 'Brownie', param: null, make: () => new fabric.filters.Brownie() },
];

export const findGalleryFilter = (id) => FILTER_GALLERY.find((f) => f.id === id);

function addAdvancedAdjustments(filters, adj) {
  if (adj.levelsBlack !== undefined || adj.levelsWhite !== undefined || adj.levelsGamma !== undefined) {
    const black = Number(adj.levelsBlack || 0) / 255;
    const white = Number(adj.levelsWhite ?? 255) / 255;
    const span = Math.max(0.01, white - black);
    filters.push(new fabric.filters.Brightness({ brightness: -black }));
    filters.push(new fabric.filters.Contrast({ contrast: Math.max(-0.99, Math.min(0.99, (1 / span - 1) / 2)) }));
    const gamma = Math.max(0.1, Number(adj.levelsGamma || 1));
    filters.push(new fabric.filters.Gamma({ gamma: [gamma, gamma, gamma] }));
  }
  if (adj.curvesShadows || adj.curvesMidtones || adj.curvesHighlights) {
    const shadows = Number(adj.curvesShadows || 0), mid = Number(adj.curvesMidtones || 0), highlights = Number(adj.curvesHighlights || 0);
    filters.push(new fabric.filters.Brightness({ brightness: Math.max(-1, Math.min(1, (shadows + highlights) * 0.22)) }));
    filters.push(new fabric.filters.Contrast({ contrast: Math.max(-0.99, Math.min(0.99, (highlights - shadows) * 0.45)) }));
    const gamma = Math.max(0.2, Math.min(2.2, 1 - mid * 0.7));
    filters.push(new fabric.filters.Gamma({ gamma: [gamma, gamma, gamma] }));
  }
  if (adj.balanceRed || adj.balanceGreen || adj.balanceBlue) {
    filters.push(new fabric.filters.ColorMatrix({ matrix: [
      1, 0, 0, 0, Number(adj.balanceRed || 0),
      0, 1, 0, 0, Number(adj.balanceGreen || 0),
      0, 0, 1, 0, Number(adj.balanceBlue || 0),
      0, 0, 0, 1, 0,
    ] }));
  }
  if (adj.exposure) filters.push(new fabric.filters.Brightness({ brightness: Math.max(-1, Math.min(1, Number(adj.exposure) || 0)) }));
  if (adj.vibrance) filters.push(new fabric.filters.Vibrance({ vibrance: Math.max(-1, Math.min(1, Number(adj.vibrance) || 0)) }));
  if (adj.invert) filters.push(new fabric.filters.Invert());
  if (adj.blackWhite) filters.push(new fabric.filters.BlackWhite());
  if (adj.posterizeLevels) filters.push(new PosterizeFilter({ levels: Math.max(2, Math.min(32, Number(adj.posterizeLevels) || 6)) }));
  if (adj.thresholdLevel !== undefined) filters.push(new ThresholdFilter({ threshold: Math.max(0, Math.min(255, Number(adj.thresholdLevel) || 0)) }));
  if (adj.gradientMap?.from && adj.gradientMap?.to) filters.push(new GradientMapFilter(adj.gradientMap));
  if (adj.photoFilter?.color && Number(adj.photoFilter?.density) > 0) filters.push(new fabric.filters.BlendColor({
    color: adj.photoFilter.color,
    mode: 'tint',
    alpha: Math.max(0, Math.min(1, Number(adj.photoFilter.density))),
  }));
  if (adj.channelMixer) {
    const red = adj.channelMixer.red || {}, green = adj.channelMixer.green || {}, blue = adj.channelMixer.blue || {};
    filters.push(new fabric.filters.ColorMatrix({ matrix: [
      Number(red.red ?? 1), Number(red.green || 0), Number(red.blue || 0), 0, Number(red.constant || 0),
      Number(green.red || 0), Number(green.green ?? 1), Number(green.blue || 0), 0, Number(green.constant || 0),
      Number(blue.red || 0), Number(blue.green || 0), Number(blue.blue ?? 1), 0, Number(blue.constant || 0),
      0, 0, 0, 1, 0,
    ] }));
  }
}

/**
 * Applies (or removes) one named filter on an image layer, alongside
 * whatever adjustment filters (Batch 15) are already on it — filters are
 * additive and stack in the order applied, matching how a real filter
 * stack behaves. Re-calling with the same id replaces that filter's
 * params rather than duplicating it.
 */
export function toggleGalleryFilter(obj, filterId, value) {
  if (obj.type !== 'image') return;
  const entry = FILTER_GALLERY.find((f) => f.id === filterId);
  if (!entry) return;

  const data = obj.get('data') || {};
  const activeGallery = { ...(data.galleryFilters || {}) };

  if (value === null) {
    delete activeGallery[filterId];
  } else {
    activeGallery[filterId] = entry.param ? value : true;
  }
  obj.set('data', { ...data, galleryFilters: activeGallery });
  rebuildFilterStack(obj);
}

/** Rebuilds obj.filters from data.adjustments (Batch 15) + data.galleryFilters, in that order, then re-applies. */
export function rebuildFilterStack(obj) {
  const data = obj.get('data') || {};
  const filters = [];

  const adj = { ...(data.adjustments || {}), ...(data.inheritedAdjustments || {}) };
  if (adj.brightness) filters.push(new fabric.filters.Brightness({ brightness: adj.brightness }));
  if (adj.contrast) filters.push(new fabric.filters.Contrast({ contrast: adj.contrast }));
  if (adj.saturation) filters.push(new fabric.filters.Saturation({ saturation: adj.saturation }));
  if (adj.hue) filters.push(new fabric.filters.HueRotation({ rotation: adj.hue }));
  addAdvancedAdjustments(filters, adj);

  const gallery = data.galleryFilters || {};
  for (const [id, value] of Object.entries(gallery)) {
    const entry = FILTER_GALLERY.find((f) => f.id === id);
    if (!entry) continue;
    filters.push(entry.make(entry.param ? value : undefined));
  }

  for (const effect of (data.layerEffects || []).filter((candidate) => candidate?.enabled !== false)) {
    if (effect.type === 'colorOverlay') filters.push(new fabric.filters.BlendColor({
      color: effect.color || '#000000', mode: 'tint',
      alpha: Math.max(0, Math.min(1, Number(effect.opacity ?? 1))),
    }));
    if (effect.type === 'gradientOverlay') filters.push(new GradientOverlayFilter(effect));
  }

  obj.filters = filters;
  obj.applyFilters();
}
