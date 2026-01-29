// Generates Electron app icons (ICO, ICNS, PNG) from a high-res source PNG.
// Usage: node scripts/generate-icons.js
// Requires: devDependency "icon-gen"

const path = require('path');
const fs = require('fs');
const iconGen = require('icon-gen');

async function main() {
  const projectRoot = process.cwd();
  const assetsDir = path.join(projectRoot, 'assets');
  const sourcePngCandidates = [
    path.join(projectRoot, 'public', 'web-app-manifest-512x512.png'),
    path.join(projectRoot, 'public', 'icon1.png'),
    path.join(projectRoot, 'public', 'apple-icon.png'),
  ];

  const source = sourcePngCandidates.find((p) => fs.existsSync(p));
  if (!source) {
    console.error('No suitable source PNG found in public/. Expected one of:', sourcePngCandidates);
    process.exit(1);
  }

  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir);
  }

  console.log('Generating icons from:', source);
  try {
    const results = await iconGen(source, assetsDir, {
      modes: ['ico', 'icns', 'png'],
      names: {
        ico: 'icon',
        icns: 'icon',
        png: 'icon',
      },
      report: true,
    });

    console.log('Icon generation results:', results);

    // Fix: Move files if they were generated in temp or elsewhere
    results.forEach((filePath) => {
      const fileName = path.basename(filePath);
      const destPath = path.join(assetsDir, fileName);
      
      if (path.normalize(filePath) !== path.normalize(destPath)) {
        console.log(`Copying ${fileName} to ${assetsDir}...`);
        fs.copyFileSync(filePath, destPath);
      }
    });

    console.log('Icons generated/copied to', assetsDir);
  } catch (err) {
    console.error('Failed to generate icons:', err);
    process.exit(1);
  }
}

main();