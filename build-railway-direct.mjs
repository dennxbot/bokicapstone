#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting Railway build process...');

// Clean previous build
if (fs.existsSync('out')) {
  console.log('🧹 Cleaning previous build...');
  fs.rmSync('out', { recursive: true, force: true });
}

console.log('📦 Building with Vite using direct Node.js approach...');
try {
  // Import and run Vite build programmatically
  const { build } = await import('./node_modules/vite/dist/node/index.js');
  
  console.log('🔨 Running Vite build programmatically...');
  await build({
    configFile: 'vite.config.ts',
    mode: 'production',
    logLevel: 'info'
  });
  
  console.log('✅ Vite build completed successfully!');
  
  // Verify build output
  if (fs.existsSync('out')) {
    const files = fs.readdirSync('out');
    console.log(`📁 Build output contains ${files.length} files:`);
    files.forEach(file => console.log(`  - ${file}`));
    
    // Check for main files
    if (fs.existsSync('out/index.html')) {
      console.log('✅ Main index.html found');
    } else {
      console.warn('⚠️  index.html not found in out directory');
    }
    
    if (fs.existsSync('out/assets')) {
      const assetFiles = fs.readdirSync('out/assets');
      console.log(`✅ Assets directory contains ${assetFiles.length} files`);
    }
    
    console.log('🎉 Railway build process completed!');
  } else {
    console.error('❌ Build output directory not found');
    process.exit(1);
  }
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}