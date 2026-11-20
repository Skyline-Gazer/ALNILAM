import sharp from "sharp";

/**
 * Default 1200x630 Open Graph card. Generated (not a bundled third-party
 * asset) so every Site has a real raster preview even when a post cover is an
 * SVG, which social crawlers do not render. Vector art only, no text, so the
 * output is font-independent and deterministic.
 */
const CARD = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="sky" cx="30%" cy="20%" r="90%">
      <stop offset="0%" stop-color="#f6e7ff"/>
      <stop offset="45%" stop-color="#b9a0e6"/>
      <stop offset="100%" stop-color="#241a3d"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#sky)"/>
  <circle cx="880" cy="170" r="210" fill="url(#glow)" opacity="0.45"/>
  <g fill="#ffffff">
    <circle cx="180" cy="140" r="3.5" opacity="0.9"/>
    <circle cx="260" cy="420" r="2.2" opacity="0.7"/>
    <circle cx="420" cy="220" r="2.8" opacity="0.85"/>
    <circle cx="520" cy="500" r="2" opacity="0.6"/>
    <circle cx="700" cy="120" r="2.4" opacity="0.8"/>
    <circle cx="980" cy="420" r="3.2" opacity="0.9"/>
    <circle cx="1090" cy="260" r="2.4" opacity="0.75"/>
    <circle cx="760" cy="520" r="1.8" opacity="0.6"/>
    <circle cx="360" cy="560" r="2.6" opacity="0.7"/>
    <circle cx="140" cy="320" r="1.9" opacity="0.65"/>
  </g>
  <path d="M180 140 L420 220 L700 120 L880 170 L980 420 L760 520 L520 500 L260 420 Z" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="1.5"/>
</svg>`);

export async function GET() {
  const png = await sharp(CARD).png({compressionLevel: 9}).toBuffer();
  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
