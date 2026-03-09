#!/usr/bin/env node
/**
 * Pre-build hook for EAS Build
 * Writes google-services.json from environment variable
 */

const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '..', 'android', 'app');
const outputPath = path.join(outputDir, 'google-services.json');
const rootGoogleServices = path.join(__dirname, '..', 'google-services.json');

const googleServicesJson = process.env.GOOGLE_SERVICES_JSON;

try {
  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log('📁 Created directory:', outputDir);
  }
  
  if (googleServicesJson) {
    // Use base64 encoded string from environment variable (EAS secrets)
    const decoded = Buffer.from(googleServicesJson, 'base64').toString('utf-8');
    fs.writeFileSync(outputPath, decoded);
    console.log('✅ google-services.json created from environment variable');
  } else if (fs.existsSync(rootGoogleServices)) {
    // Fallback: Copy from root directory (for local builds)
    fs.copyFileSync(rootGoogleServices, outputPath);
    console.log('✅ google-services.json copied from root directory');
  } else {
    console.log('⚠️ GOOGLE_SERVICES_JSON not set and root file not found, skipping...');
  }
} catch (error) {
  console.error('❌ Failed to create google-services.json:', error);
  // Don't exit with error for local builds - let it continue
  if (googleServicesJson) {
    process.exit(1);
  }
}
