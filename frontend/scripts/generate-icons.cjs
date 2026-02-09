const path = require('path');
const iconGen = require('icon-gen');

(async () => {
  const assetsDir = path.join(__dirname, '..', 'assets');
  const srcPng = path.join(assetsDir, 'logo.png');

  try {
    console.log('Generating icons from', srcPng);
    await iconGen(srcPng, assetsDir, {
      report: true,
      icns: { // macOS
        name: 'logo',
      },
      ico: { // Windows
        name: 'logo',
        sizes: [16, 24, 32, 48, 64, 128, 256]
      }
    });
    console.log('Icon generation complete. Check', assetsDir);
  } catch (err) {
    console.error('Failed to generate icons:', err);
    process.exit(1);
  }
})();
