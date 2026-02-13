#!/usr/bin/env node

/**
 * Generate placeholder assets for Expo app
 * Run: node scripts/generate-assets.js
 */

const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '../assets');

// Create assets directory if it doesn't exist
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Create a simple SVG icon that can be converted to PNG
const createSVGIcon = (size, filename) => {
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#007AFF"/>
  <text x="50%" y="50%" font-family="Arial" font-size="${size * 0.4}" fill="white" text-anchor="middle" dominant-baseline="middle">J</text>
</svg>`;
  
  fs.writeFileSync(path.join(assetsDir, filename.replace('.png', '.svg')), svg);
  console.log(`Created ${filename.replace('.png', '.svg')}`);
};

// Create placeholder files
const assets = [
  { name: 'icon.png', size: 1024 },
  { name: 'splash.png', size: 2048 },
  { name: 'adaptive-icon.png', size: 1024 },
  { name: 'favicon.png', size: 48 },
  { name: 'notification-icon.png', size: 96 },
];

console.log('Generating placeholder assets...\n');

assets.forEach(asset => {
  createSVGIcon(asset.size, asset.name);
});

console.log('\n✅ Placeholder assets created!');
console.log('⚠️  Note: These are SVG placeholders. For production, replace with actual PNG images.');
console.log('   You can convert SVG to PNG using online tools or ImageMagick:');
console.log('   convert icon.svg -resize 1024x1024 icon.png');
