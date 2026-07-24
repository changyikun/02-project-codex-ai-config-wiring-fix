/* @vitest-environment node */

import { describe, expect, it } from 'vitest';
import { assetBaseRewriter, resolvePublicAssetBase } from '../../vite.config';

const renderChunk = (plugin: ReturnType<typeof assetBaseRewriter>, code: string) => {
  const hook = plugin.renderChunk;
  if (typeof hook !== 'function') {
    throw new Error('renderChunk hook must be a function');
  }

  return hook.call({} as never, code, { fileName: 'assets/app.js' } as never, {} as never, { chunks: {} } as never);
};

describe('vite public asset base', () => {
  it('keeps the GitHub Pages base by default for web builds', () => {
    expect(resolvePublicAssetBase('production', {})).toBe('/feng-hua-lu/');
  });

  it('allows local root asset loading through VITE_PUBLIC_ASSET_BASE', () => {
    expect(resolvePublicAssetBase('development', { VITE_PUBLIC_ASSET_BASE: '/' })).toBe('/');
  });

  it('keeps app builds relative regardless of web asset base override', () => {
    expect(resolvePublicAssetBase('app', { VITE_PUBLIC_ASSET_BASE: '/' })).toBe('./');
  });

  it('does not rewrite hardcoded asset urls when local root base is configured', () => {
    const plugin = assetBaseRewriter('/');
    const result = renderChunk(plugin, "const bg='/assets/routes/home/bg.png';");

    expect(result).toBeNull();
  });

  it('rewrites hardcoded asset urls with the configured subpath base', () => {
    const plugin = assetBaseRewriter('/feng-hua-lu/');
    const result = renderChunk(plugin, "const bg='/assets/routes/home/bg.png';");

    expect(result).toBe("const bg='/feng-hua-lu/assets/routes/home/bg.png';");
  });
});
