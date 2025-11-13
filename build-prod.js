#!/usr/bin/env node

import { build } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function buildProject() {
  try {
    console.log('Starting Vite build...');
    console.log('Current directory:', __dirname);
    
    // Check if vite.config.ts exists
    const configPath = path.resolve(__dirname, 'vite.config.ts');
    console.log('Config file path:', configPath);
    
    if (!fs.existsSync(configPath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }
    
    console.log('Config file exists, proceeding with build...');
    
    // Build with Vite
    await build({
      configFile: configPath,
      mode: 'production',
      logLevel: 'info'
    });
    
    console.log('Build completed successfully!');
    
    // Verify output directory exists
    const outDir = path.resolve(__dirname, 'out');
    if (fs.existsSync(outDir)) {
      console.log('Output directory created:', outDir);
      const files = fs.readdirSync(outDir);
      console.log('Files in output directory:', files);
    } else {
      console.warn('Output directory not found:', outDir);
    }
    
  } catch (error) {
    console.error('Build failed:', error.message);
    console.error('Error stack:', error.stack);
    process.exit(1);
  }
}

buildProject();