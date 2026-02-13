# Setup Instructions

## Fix SDK Version and Assets

### 1. Install/Update Dependencies

Run this command to install SDK 54 compatible versions:
```bash
npm install
```

Then run Expo's install command to fix any version mismatches:
```bash
npx expo install --fix
```

### 2. Create Missing Assets

The app requires these asset files in the `assets/` directory:

- `icon.png` (1024x1024px)
- `splash.png` (2048x2048px)
- `adaptive-icon.png` (1024x1024px)
- `favicon.png` (48x48px)
- `notification-icon.png` (96x96px)

#### Quick Solution - Use Expo Asset Generator:
```bash
npx expo-asset-generator
```

#### Manual Solution:
1. Create simple placeholder images using any image editor
2. Or use online tools like [Canva](https://canva.com) or [Figma](https://figma.com)
3. Save them in the `assets/` directory with the exact filenames above

#### Temporary Workaround:
If you just want to test the app, you can temporarily create simple colored PNG files:
- Use any image editor to create colored squares
- Export as PNG with the required dimensions
- Place them in the `assets/` directory

### 3. Start the App

Once dependencies are installed and assets are created:
```bash
npm start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app (make sure your Expo Go app is updated to SDK 54)

## Troubleshooting

### SDK Version Mismatch
If you see SDK version errors:
1. Make sure `expo` in package.json is `~54.0.0`
2. Run `npx expo install --fix` to update all Expo packages
3. Clear cache: `npx expo start -c`

### Missing Assets
If assets are missing:
1. Check that files exist in `assets/` directory
2. Verify filenames match exactly (case-sensitive)
3. Restart Expo: `npx expo start -c`
