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
// Honest scope note: Ripple and Pinch would follow the exact same
// technique as Twirl (a fragment shader remapping UV coordinates before
// sampling) but aren't written yet — flagging rather than pretending the
// "distort" category is fully covered.

const KERNELS = {
  sharpen: [0, -1, 0, -1, 5, -1, 0, -1, 0],
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
}
fabric.classRegistry.setClass(TwirlFilter, 'Twirl');

// The gallery — id, label, and a factory returning a Fabric filter
// instance for the given params. `params` are exposed to the UI as
// simple 0-1 sliders wherever a filter takes one continuous parameter.
export const FILTER_GALLERY = [
  { id: 'blur', label: 'Blur', param: { key: 'blur', min: 0, max: 1, default: 0.1 }, make: (v) => new fabric.filters.Blur({ blur: v }) },
  { id: 'sharpen', label: 'Sharpen', param: null, make: () => new fabric.filters.Convolute({ matrix: KERNELS.sharpen }) },
  { id: 'noise', label: 'Noise', param: { key: 'noise', min: 0, max: 400, default: 60 }, make: (v) => new fabric.filters.Noise({ noise: v }) },
  { id: 'pixelate', label: 'Pixelate', param: { key: 'blocksize', min: 1, max: 40, default: 8 }, make: (v) => new fabric.filters.Pixelate({ blocksize: v }) },
  { id: 'emboss', label: 'Emboss', param: null, make: () => new fabric.filters.Convolute({ matrix: KERNELS.emboss }) },
  { id: 'findEdges', label: 'Find edges', param: null, make: () => new fabric.filters.Convolute({ matrix: KERNELS.findEdges }) },
  { id: 'twirl', label: 'Twirl (distort)', param: { key: 'angle', min: -6, max: 6, default: 2 }, make: (v) => new TwirlFilter({ angle: v }) },
];

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

  const adj = data.adjustments || {};
  if (adj.brightness) filters.push(new fabric.filters.Brightness({ brightness: adj.brightness }));
  if (adj.contrast) filters.push(new fabric.filters.Contrast({ contrast: adj.contrast }));
  if (adj.saturation) filters.push(new fabric.filters.Saturation({ saturation: adj.saturation }));
  if (adj.hue) filters.push(new fabric.filters.HueRotation({ rotation: adj.hue }));

  const gallery = data.galleryFilters || {};
  for (const [id, value] of Object.entries(gallery)) {
    const entry = FILTER_GALLERY.find((f) => f.id === id);
    if (!entry) continue;
    filters.push(entry.make(entry.param ? value : undefined));
  }

  obj.filters = filters;
  obj.applyFilters();
}
