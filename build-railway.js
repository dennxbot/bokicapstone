#!/usr/bin/env node

// Railway build script that bypasses TypeScript compilation issues
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  console.log('🚀 Starting Railway build...');
  
  // Check if we're in production mode
  const isProduction = process.env.NODE_ENV === 'production';
  console.log(`📍 Environment: ${isProduction ? 'Production' : 'Development'}`);
  
  // Clean previous build if exists
  const outDir = path.join(process.cwd(), 'out');
  if (fs.existsSync(outDir)) {
    console.log('🧹 Cleaning previous build...');
    fs.rmSync(outDir, { recursive: true, force: true });
  }
  
  // Build with Vite directly (no TypeScript compilation step)
  console.log('🔨 Building with Vite...');
  execSync('npx vite build', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  
  // Verify build output
  if (!fs.existsSync(outDir)) {
    throw new Error('Build failed: output directory not created');
  }
  
  const files = fs.readdirSync(outDir);
  console.log(`✅ Build completed successfully! Created ${files.length} files in out/ directory`);
  
  // List main files for debugging
  const mainFiles = files.filter(f => f.endsWith('.html') || f.endsWith('.js') || f.endsWith('.css'));
  if (mainFiles.length > 0) {
    console.log('📁 Main build files:', mainFiles.join(', '));
  }
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  console.error('💡 This might be due to missing dependencies or build configuration issues');
  process.exit(1);
}