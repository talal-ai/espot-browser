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

const config = {
  entryPoints: {
    'main': 'electron/main/main.ts',
    'preload': 'electron/preload/preload.ts'
  },
  bundle: true,
  outdir: 'dist-electron',
  outExtension: { '.js': '.js' },
  platform: 'node',
  target: 'node18',
  external: ['electron'],
  sourcemap: isDev,
  minify: !isDev,
  logLevel: 'info',
};

await syncElectronAssets();

if (isDev) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log('👀 Watching Electron files for changes...');
} else {
  await esbuild.build(config);
  console.log('✅ Electron build complete');
}
