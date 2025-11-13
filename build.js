#!/usr/bin/env node

const { build } = require('vite');
const path = require('path');

async function buildProject() {
  try {
    console.log('Starting Vite build...');
    console.log('Current directory:', __dirname);
    console.log('Config file path:', path.resolve(__dirname, 'vite.config.ts'));
    
    await build({
      configFile: path.resolve(__dirname, 'vite.config.ts'),
      mode: 'production',
      logLevel: 'info'
    });
    
    console.log('Build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error);
    console.error('Error stack:', error.stack);
    process.exit(1);
  }
}

buildProject();