#!/usr/bin/env node

/**
 * ESPOT Browser Development Startup Script
 * This script ensures all dependencies are installed and starts the dev environment
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function checkNodeModules() {
  const nodeModulesPath = path.join(__dirname, 'node_modules');
  return fs.existsSync(nodeModulesPath);
}

function installDependencies() {
  log('\n📦 Installing dependencies...', colors.yellow);
  try {
    execSync('npm install', { stdio: 'inherit' });
    log('✅ Dependencies installed successfully!', colors.green);
    return true;
  } catch (error) {
    log('❌ Failed to install dependencies', colors.red);
    return false;
  }
}

function startDevServer() {
  log('\n🚀 Starting ESPOT Browser Development Environment...', colors.blue);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.blue);
  log('📊 Dashboard will load automatically', colors.green);
  log('🔄 Hot Module Replacement (HMR) enabled', colors.green);
  log('🎨 Dark mode enabled by default', colors.green);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', colors.blue);

  const devProcess = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true,
  });

  devProcess.on('error', (error) => {
    log(`❌ Error starting dev server: ${error.message}`, colors.red);
    process.exit(1);
  });

  devProcess.on('close', (code) => {
    if (code !== 0) {
      log(`❌ Dev server exited with code ${code}`, colors.red);
      process.exit(code);
    }
  });
}

// Main execution
(async function main() {
  log('\n╔══════════════════════════════════════════════╗', colors.bright);
  log('║       ESPOT Browser - Admin Dashboard       ║', colors.bright);
  log('║            Development Environment           ║', colors.bright);
  log('╚══════════════════════════════════════════════╝\n', colors.bright);

  // Check if node_modules exists
  if (!checkNodeModules()) {
    log('⚠️  node_modules not found', colors.yellow);
    const installed = installDependencies();
    if (!installed) {
      log('\n❌ Setup failed. Please run "npm install" manually.', colors.red);
      process.exit(1);
    }
  } else {
    log('✅ Dependencies found', colors.green);
  }

  // Start the dev server
  startDevServer();
})();
