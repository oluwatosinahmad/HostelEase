/**
 * HOSTEL EASE — DEVELOPMENT TUNNEL & LIVE UPSTREAM REGISTRATION
 * 
 * Automatically launches cloudflared tunnel over HTTP/2, extracts the public HTTPS URL,
 * and registers it with https://hostelease.oluwatosinahmad.workers.dev so all live website
 * requests proxy directly to your local Express server and SQLite database!
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import dns from 'dns';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

const CLOUDFLARED_BIN = path.resolve(process.cwd(), 'cloudflared.exe');
const LIVE_URL = (process.env.LIVE_SITE_URL || 'https://hostelease.oluwatosinahmad.workers.dev').replace(/\/+$/, '');
const SYNC_SECRET = process.env.SYNC_SECRET || 'hostel_ease_sync_secret_2026';
const LOCAL_PORT = process.env.PORT || 5000;

if (!fs.existsSync(CLOUDFLARED_BIN)) {
  console.error(`❌ cloudflared.exe not found at ${CLOUDFLARED_BIN}`);
  process.exit(1);
}

console.log('=================================================================');
console.log('🚀 HOSTEL EASE — LAUNCHING LIVE SYNCHRONIZATION TUNNEL');
console.log('=================================================================');
console.log(`📡 Forwarding: http://localhost:${LOCAL_PORT}`);
console.log(`🌐 Target:     ${LIVE_URL}`);
console.log('⏳ Establishing secure HTTP/2 tunnel connection with Cloudflare edge...');

const child = spawn(CLOUDFLARED_BIN, [
  'tunnel',
  '--protocol', 'http2',
  '--url', `http://localhost:${LOCAL_PORT}`
], {
  stdio: ['ignore', 'pipe', 'pipe']
});

let registered = false;

function handleOutput(data: Buffer) {
  const text = data.toString();
  const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
  
  if (match && !registered) {
    const tunnelUrl = match[0];
    registered = true;

    console.log('\n=================================================================');
    console.log(`✅ PUBLIC TUNNEL ACTIVE: ${tunnelUrl}`);
    console.log('=================================================================');
    console.log(`📡 Registering upstream with ${LIVE_URL}...`);

    fetch(`${LIVE_URL}/api/sync/register-upstream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upstreamUrl: tunnelUrl, secret: SYNC_SECRET })
    })
      .then(r => r.json())
      .then(res => {
        console.log(`🎉 Upstream registered! Live website (${LIVE_URL}) is now proxying directly to your local machine.`);
        console.log('👉 Any action on the live site will directly read/write your local SQLite database!');
        console.log('🛑 Press Ctrl+C at any time to close the tunnel.\n');
      })
      .catch(err => {
        console.warn(`⚠️ Failed to register upstream with live site: ${err.message}`);
      });
  }
}

child.stdout.on('data', handleOutput);
child.stderr.on('data', handleOutput);

child.on('close', code => {
  console.log(`\n🔒 Tunnel process exited with code ${code}`);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down tunnel...');
  child.kill('SIGINT');
  process.exit(0);
});
