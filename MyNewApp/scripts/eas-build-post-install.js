const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '../android/app/src/main/AndroidManifest.xml');

if (fs.existsSync(manifestPath)) {
  let manifest = fs.readFileSync(manifestPath, 'utf8');
  
  // Add tools namespace if not present
  if (!manifest.includes('xmlns:tools=')) {
    manifest = manifest.replace(
      'xmlns:android="http://schemas.android.com/apk/res/android"',
      'xmlns:android="http://schemas.android.com/apk/res/android"\n    xmlns:tools="http://schemas.android.com/tools"'
    );
  }
  
  // Add tools:replace to notification channel metadata
  manifest = manifest.replace(
    /<meta-data\s+android:name="com\.google\.firebase\.messaging\.default_notification_channel_id"/g,
    '<meta-data\n        tools:replace="android:value"\n        android:name="com.google.firebase.messaging.default_notification_channel_id"'
  );
  
  fs.writeFileSync(manifestPath, manifest, 'utf8');
  console.log('✅ Fixed Android manifest conflicts');
}
