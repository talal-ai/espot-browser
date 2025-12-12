import esbuild from 'esbuild';

const isDev = process.argv.includes('--watch');

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

if (isDev) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log('👀 Watching Electron files for changes...');
} else {
  await esbuild.build(config);
  console.log('✅ Electron build complete');
}
