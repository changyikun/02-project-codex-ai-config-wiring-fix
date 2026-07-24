import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';

const DEFAULT_WEB_PUBLIC_ASSET_BASE = '/feng-hua-lu/';

const normalizePublicAssetBase = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '/') {
    return '/';
  }

  if (trimmed === './') {
    return './';
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
};

export const resolvePublicAssetBase = (mode: string, env: Record<string, string | undefined>): string => {
  if (mode === 'app') {
    return './';
  }

  return normalizePublicAssetBase(env.VITE_PUBLIC_ASSET_BASE ?? DEFAULT_WEB_PUBLIC_ASSET_BASE);
};

/**
 * Vite 插件：自动为硬编码的 /assets/ 路径添加 base 前缀
 */
export function assetBaseRewriter(base: string): Plugin {
  return {
    name: 'vite-plugin-asset-base-rewriter',
    apply: 'build',
    renderChunk(code, chunk) {
      if (!chunk.fileName.endsWith('.js') && !chunk.fileName.endsWith('.css')) {
        return null;
      }
      // 只替换独立出现的 /assets/ 路径（排除已经带有 base 的路径）
      const result = code.replace(/(?<![\w/])\/assets\//g, `${base}assets/`);
      return result !== code ? result : null;
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const isAppBuild = mode === 'app';
  const base = resolvePublicAssetBase(mode, env);

  return {
    base,
    plugins: [
      react(),
      // 添加插件处理硬编码的 /assets/ 路径
      assetBaseRewriter(base),
    ],
    clearScreen: false,
    build: {
      outDir: isAppBuild ? 'dist-app' : 'dist',
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      hmr: {
        overlay: true,
      },
      watch: {
        usePolling: true,
        interval: 120,
      },
      proxy: {
        '/api': {
          target: 'http://localhost:8787',
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      port: isAppBuild ? 4174 : 4173,
      strictPort: true,
    },
  };
});
