// Batch 10 support — loads a font family into the browser (and the
// Fabric canvas, which just reads document.fonts like everything else)
// on demand, the moment it's actually selected rather than upfront. A
// library of "hundreds of fonts" that all loaded eagerly would make the
// Studio's first paint miserable; this keeps it to "only what's in use."
const loaded = new Set();

/** Google Fonts family — fetched via the key-free css2 endpoint, injected as a <link>. */
export function loadGoogleFont(family) {
  if (loaded.has(`google:${family}`)) return Promise.resolve();
  loaded.add(`google:${family}`);
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}:wght@400;700&display=swap`;
    link.onload = () => {
      // The <link> loading just means the CSS rules exist — the actual
      // glyphs are lazy-fetched by the browser the first time something
      // renders with this font-family. Force that now via the FontFace
      // Loading API so the canvas's very first paint already has it,
      // instead of showing a fallback face for one frame then reflowing.
      Promise.all([
        document.fonts.load(`400 16px "${family}"`),
        document.fonts.load(`700 16px "${family}"`),
      ]).finally(resolve);
    };
    link.onerror = () => resolve(); // fall back silently — canvas just renders in the default face
    document.head.appendChild(link);
  });
}

/** A custom-uploaded font variant — loaded straight from our own CDN via the FontFace API. */
export async function loadUploadedFontVariant(family, variant) {
  const key = `upload:${family}:${variant.weight}:${variant.style}`;
  if (loaded.has(key)) return;
  loaded.add(key);
  if (!variant.fileUrl) return;
  const face = new FontFace(family, `url(${variant.fileUrl})`, { weight: String(variant.weight), style: variant.style });
  await face.load();
  document.fonts.add(face);
}

export async function loadUploadedFont(fontDoc) {
  await Promise.all((fontDoc.variants || []).map((v) => loadUploadedFontVariant(fontDoc.family, v)));
}

/** Dispatches to the right loader based on a Font document's `source`. */
export function loadFont(fontDoc) {
  if (fontDoc.source === 'google') return loadGoogleFont(fontDoc.googleFamily || fontDoc.family);
  return loadUploadedFont(fontDoc);
}
