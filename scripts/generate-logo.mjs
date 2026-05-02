/**
 * BCWork Logo Generator
 * Generates SVG logo + converts to PNG/ICO for web and Tauri agent
 */
import { writeFileSync, mkdirSync } from 'fs'
import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

// ── SVG Icon (square, for app icon) ──────────────────────────────────────────
// Design: Hexagon with stylized "B" pulse line — connectivity + monitoring
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a"/>
      <stop offset="100%" style="stop-color:#1e3a8a"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#06b6d4"/>
      <stop offset="100%" style="stop-color:#3b82f6"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background rounded square -->
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>

  <!-- Outer ring (subtle) -->
  <circle cx="256" cy="256" r="210" fill="none" stroke="#1e40af" stroke-width="2" opacity="0.5"/>

  <!-- Hexagon shape -->
  <polygon points="256,72 406,162 406,350 256,440 106,350 106,162"
    fill="none" stroke="url(#accent)" stroke-width="6" opacity="0.9"/>

  <!-- Inner hexagon (smaller) -->
  <polygon points="256,120 370,185 370,327 256,392 142,327 142,185"
    fill="#0f172a" opacity="0.7"/>

  <!-- "B" stylized as pulse/signal line -->
  <!-- Left vertical bar -->
  <rect x="176" y="172" width="22" height="168" rx="8" fill="url(#accent)" filter="url(#glow)"/>

  <!-- Top bump of B -->
  <path d="M198 172 Q272 172 272 214 Q272 256 198 256" fill="none" stroke="url(#accent)" stroke-width="22" stroke-linecap="round" filter="url(#glow)"/>

  <!-- Bottom bump of B (wider) -->
  <path d="M198 256 Q284 256 284 298 Q284 340 198 340" fill="none" stroke="url(#accent)" stroke-width="22" stroke-linecap="round" filter="url(#glow)"/>

  <!-- Pulse/ECG line extending right from B -->
  <polyline points="290,256 310,256 322,228 338,290 350,240 366,256 386,256"
    fill="none" stroke="#06b6d4" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" opacity="0.85" filter="url(#glow)"/>

  <!-- Corner dots (connectivity nodes) -->
  <circle cx="256" cy="72" r="8" fill="#06b6d4" opacity="0.8"/>
  <circle cx="406" cy="162" r="8" fill="#06b6d4" opacity="0.6"/>
  <circle cx="406" cy="350" r="8" fill="#06b6d4" opacity="0.6"/>
  <circle cx="256" cy="440" r="8" fill="#06b6d4" opacity="0.8"/>
  <circle cx="106" cy="350" r="8" fill="#06b6d4" opacity="0.6"/>
  <circle cx="106" cy="162" r="8" fill="#06b6d4" opacity="0.6"/>
</svg>`

// ── SVG Logotype (horizontal, for web header) ────────────────────────────────
const logotypeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 160" width="640" height="160">
  <defs>
    <linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a"/>
      <stop offset="100%" style="stop-color:#1e3a8a"/>
    </linearGradient>
    <linearGradient id="accent2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#06b6d4"/>
      <stop offset="100%" style="stop-color:#3b82f6"/>
    </linearGradient>
    <filter id="glow2">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="640" height="160" rx="20" fill="url(#bg2)"/>

  <!-- Hexagon icon (scaled down) -->
  <g transform="translate(20,20) scale(0.234)">
    <polygon points="256,72 406,162 406,350 256,440 106,350 106,162"
      fill="none" stroke="url(#accent2)" stroke-width="6" opacity="0.9"/>
    <polygon points="256,120 370,185 370,327 256,392 142,327 142,185"
      fill="#0f172a" opacity="0.7"/>
    <rect x="176" y="172" width="22" height="168" rx="8" fill="url(#accent2)" filter="url(#glow2)"/>
    <path d="M198 172 Q272 172 272 214 Q272 256 198 256" fill="none" stroke="url(#accent2)" stroke-width="22" stroke-linecap="round" filter="url(#glow2)"/>
    <path d="M198 256 Q284 256 284 298 Q284 340 198 340" fill="none" stroke="url(#accent2)" stroke-width="22" stroke-linecap="round" filter="url(#glow2)"/>
    <polyline points="290,256 310,256 322,228 338,290 350,240 366,256 386,256"
      fill="none" stroke="#06b6d4" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>
  </g>

  <!-- BCWork text -->
  <text x="150" y="100" font-family="'Inter', 'Helvetica Neue', Arial, sans-serif"
    font-size="72" font-weight="800" letter-spacing="-2"
    fill="white">BC</text>
  <text x="252" y="100" font-family="'Inter', 'Helvetica Neue', Arial, sans-serif"
    font-size="72" font-weight="300" letter-spacing="-2"
    fill="url(#accent2)">Work</text>

  <!-- Tagline -->
  <text x="152" y="130" font-family="'Inter', 'Helvetica Neue', Arial, sans-serif"
    font-size="18" font-weight="400" letter-spacing="3"
    fill="#64748b">MONITORING · PRODUCTIVITY</text>
</svg>`

// ── Write SVG files ───────────────────────────────────────────────────────────
const publicDir = path.join(ROOT, 'apps/web/public')
const logoDir = path.join(ROOT, 'apps/web/public/brand')
mkdirSync(logoDir, { recursive: true })

writeFileSync(path.join(logoDir, 'icon.svg'), iconSvg)
writeFileSync(path.join(logoDir, 'logotype.svg'), logotypeSvg)
console.log('✅ SVG files written')

// ── Convert to PNG using sharp (if available) ─────────────────────────────────
try {
  const { createRequire } = await import('module')
  const require = createRequire(import.meta.url)

  // Try to use sharp
  let sharp
  try {
    sharp = require('sharp')
  } catch {
    console.log('📦 Installing sharp...')
    execSync('pnpm add -w -D sharp', { cwd: ROOT, stdio: 'inherit' })
    sharp = require('sharp')
  }

  const iconSvgBuf = Buffer.from(iconSvg)

  // Web app sizes
  const webSizes = [
    { size: 16, name: 'favicon-16.png' },
    { size: 32, name: 'favicon-32.png' },
    { size: 180, name: 'apple-touch-icon.png' },
    { size: 192, name: 'icon-192.png' },
    { size: 512, name: 'icon-512.png' },
  ]

  for (const { size, name } of webSizes) {
    await sharp(iconSvgBuf)
      .resize(size, size)
      .png()
      .toFile(path.join(logoDir, name))
    console.log(`✅ ${name}`)
  }

  // Copy favicon to public root
  await sharp(iconSvgBuf).resize(32, 32).png().toFile(path.join(publicDir, 'favicon.png'))

  // Tauri agent icon sizes
  const tauriIconDir = path.join(ROOT, 'apps/agent/src-tauri/icons')
  mkdirSync(tauriIconDir, { recursive: true })

  const tauriSizes = [
    { size: 32, name: '32x32.png' },
    { size: 128, name: '128x128.png' },
    { size: 256, name: '128x128@2x.png' },
    { size: 512, name: 'icon.png' },
  ]

  for (const { size, name } of tauriSizes) {
    await sharp(iconSvgBuf)
      .resize(size, size)
      .png()
      .toFile(path.join(tauriIconDir, name))
    console.log(`✅ Tauri ${name}`)
  }

  // OG image (logotype wide)
  const logoBuf = Buffer.from(logotypeSvg)
  await sharp(logoBuf)
    .resize(1200, 300)
    .png()
    .toFile(path.join(logoDir, 'og-image.png'))
  console.log('✅ og-image.png')

  console.log('\n🎉 All logo assets generated!')
} catch (e) {
  console.error('Sharp conversion failed:', e.message)
  console.log('SVG files are ready. Install sharp manually to convert to PNG.')
}
