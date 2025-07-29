import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Starting HTTPS development server...');

// Check if certificates exist (mkcert format)
const certPath = './localhost+3.pem';
const keyPath = './localhost+3-key.pem';

if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  console.log('❌ SSL certificates not found!');
  console.log('📜 Run: npm run cert');
  process.exit(1);
}

// Start Next.js with HTTPS
const nextProcess = spawn('npx', ['next', 'dev', '--experimental-https', '--experimental-https-key', keyPath, '--experimental-https-cert', certPath, '-H', '0.0.0.0', '-p', '3001'], {
  stdio: 'inherit',
  shell: true
});

nextProcess.on('error', (error) => {
  console.error('❌ Failed to start HTTPS server:', error);
});

nextProcess.on('close', (code) => {
  console.log(`📴 HTTPS server exited with code ${code}`);
});

console.log('✅ HTTPS server starting...');
console.log('🔒 https://localhost:3001');
console.log('🌐 https://192.168.1.75:3001');