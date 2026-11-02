import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const tokens = fs.readFileSync(new URL('../../themes/shirone/src/tokens.css', import.meta.url), 'utf8');
const palettes = [...tokens.matchAll(/:root(?:\[data-theme="light"\])?\s*\{([^}]+)\}/g)]
  .map(([, body]) => Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*(#[\da-f]+);/gi)].map(([, key, value]) => [key, value])));
const luminance = hex => {
  const value = hex.length === 4 ? hex.slice(1).split('').map(c => c + c).join('') : hex.slice(1);
  const channels = value.match(/../g).map(c => parseInt(c, 16) / 255)
    .map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};

test('both modes define the same semantic color roles', () => {
  assert.equal(palettes.length, 2);
  assert.deepEqual(Object.keys(palettes[0]).sort(), Object.keys(palettes[1]).sort());
});

test('semantic foreground/background pairs meet normal-text contrast in both modes', () => {
  for (const [mode, palette] of palettes.entries()) {
    for (const [foreground, background] of [
      ['on-primary', 'primary'], ['on-primary-container', 'primary-container'],
      ['on-secondary', 'secondary'], ['on-secondary-container', 'secondary-container'],
      ['on-tertiary', 'tertiary'], ['on-tertiary-container', 'tertiary-container'],
      ['on-surface', 'surface'], ['on-surface', 'surface-container-highest'],
      ['on-surface-variant', 'surface-container-highest'], ['on-error', 'error'],
    ]) {
      assert.ok(palette[`--${foreground}`] && palette[`--${background}`]);
      const values = [luminance(palette[`--${foreground}`]), luminance(palette[`--${background}`])].sort((a, b) => b - a);
      const ratio = (values[0] + 0.05) / (values[1] + 0.05);
      assert.ok(ratio >= 4.5, `${mode === 0 ? 'dark' : 'light'} ${foreground}/${background}: ${ratio.toFixed(2)}`);
    }
  }
});
