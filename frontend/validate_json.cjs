const fs = require('fs');
const content = fs.readFileSync('package.json', 'utf8');
try {
  JSON.parse(content);
  console.log('Valid JSON');
} catch (e) {
  console.error('Invalid JSON:', e.message);
  // Try to find the line
  const lines = content.split('\n');
  console.log('Context of error around line 90:');
  for (let i = 85; i < 95; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
}
