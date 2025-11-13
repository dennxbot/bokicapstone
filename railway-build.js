#!/usr/bin/env node

// Railway-specific build script that completely bypasses npm scripts
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Railway Build Starting...');

// Set production environment
process.env.NODE_ENV = 'production';

try {
  // Clean previous build
  const outDir = path.join(process.cwd(), 'out');
  if (fs.existsSync(outDir)) {
    console.log('🧹 Cleaning previous build...');
    fs.rmSync(outDir, { recursive: true, force: true });
  }

  // Install dependencies if node_modules doesn't exist
  if (!fs.existsSync('node_modules')) {
    console.log('📦 Installing dependencies...');
    execSync('npm install --production=false', { stdio: 'inherit' });
  }

  // Build with Vite directly (completely bypass npm scripts)
  console.log('🔨 Building with Vite...');
  execSync('npx vite build', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });

  // Verify build
  if (!fs.existsSync(outDir)) {
    throw new Error('Build failed: output directory not created');
  }

  const files = fs.readdirSync(outDir);
  console.log(`✅ Build completed! Created ${files.length} files`);
  
  // Show main files
  const mainFiles = files.filter(f => f.endsWith('.html') || f.endsWith('.js') || f.endsWith('.css'));
  if (mainFiles.length > 0) {
    console.log('📁 Main files:', mainFiles.join(', '));
  }

  process.exit(0);
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}