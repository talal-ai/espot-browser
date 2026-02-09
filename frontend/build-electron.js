import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import esbuild from 'esbuild';

const isDev = process.argv.includes('--watch');

const assetsSourcePath = path.resolve('assets');
const distAssetsPath = path.resolve('dist-electron', 'assets');

async function syncElectronAssets() {
  await rm(distAssetsPath, { recursive: true, force: true });
  await mkdir(distAssetsPath, { recursive: true });
  await cp(assetsSourcePath, distAssetsPath, { recursive: true, force: true });
  console.log('🧱 Copied Electron assets into dist-electron/assets');
}

const commonConfig = {
  bundle: true,
  outdir: 'dist-electron',
  outExtension: { '.js': '.js' },
  platform: 'node',
  target: 'node18',
  external: ['electron', 'electron-context-menu'],
  sourcemap: isDev,
  minify: !isDev,
  logLevel: 'info',
};

const mainConfig = {
  ...commonConfig,
  entryPoints: { 'main': 'electron/main/main.ts' },
  format: 'esm',
  banner: {
    js: `import { createRequire } from 'module';const require = createRequire(import.meta.url);import { fileURLToPath } from 'url';import { dirname } from 'path';const __filename = fileURLToPath(import.meta.url);const __dirname = dirname(__filename);`,
  },
};

const preloadConfig = {
  ...commonConfig,
  entryPoints: { 'preload': 'electron/preload/preload.ts' },
  format: 'cjs',
};

await syncElectronAssets();

if (isDev) {
  const mainCtx = await esbuild.context(mainConfig);
  const preloadCtx = await esbuild.context(preloadConfig);
  await Promise.all([mainCtx.watch(), preloadCtx.watch()]);
  console.log('👀 Watching Electron files for changes...');
} else {
  await Promise.all([esbuild.build(mainConfig), esbuild.build(preloadConfig)]);
  console.log('✅ Electron build complete');
}