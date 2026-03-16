#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const appDelegatePath = path.join(projectRoot, 'ios/Depanini/AppDelegate.swift');

if (!fs.existsSync(appDelegatePath)) {
  console.log('⚠️ AppDelegate.swift not found, skipping Firebase fix');
  process.exit(0);
}

let content = fs.readFileSync(appDelegatePath, 'utf8');

// Check if FirebaseCore is already imported
if (content.includes('import FirebaseCore')) {
  console.log('✅ Firebase configuration already present in AppDelegate.swift');
  process.exit(0);
}

// Add Firebase import after ReactAppDependencyProvider
content = content.replace(
  'import ReactAppDependencyProvider',
  'import ReactAppDependencyProvider\nimport FirebaseCore'
);

// Add FirebaseApp.configure() before React Native initialization
content = content.replace(
  'let delegate = ReactNativeDelegate()',
  '// Configure Firebase before any Firebase usage\n    FirebaseApp.configure()\n\n    let delegate = ReactNativeDelegate()'
);

fs.writeFileSync(appDelegatePath, content);
console.log('✅ Added FirebaseApp.configure() to AppDelegate.swift');
