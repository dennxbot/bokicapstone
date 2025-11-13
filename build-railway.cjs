#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Railway build process...');

// Clean previous build
if (fs.existsSync('out')) {
  console.log('🧹 Cleaning previous build...');
  fs.rmSync('out', { recursive: true, force: true });
}

console.log('📦 Building with Vite...');
try {
  // Build with Vite directly (no TypeScript compilation)
  execSync('npx vite build', {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
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