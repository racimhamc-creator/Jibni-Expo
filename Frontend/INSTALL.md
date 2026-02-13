# Installation Instructions

## Fix Dependency Conflicts

The project has been updated to Expo SDK 54. To resolve dependency conflicts:

### Step 1: Clean Install

```bash
# Remove node_modules and lock file (if you have permission issues, use sudo or manually delete)
rm -rf node_modules package-lock.json

# Or use npm's clean command
npm clean-install
```

### Step 2: Install with Legacy Peer Deps (Recommended)

```bash
npm install --legacy-peer-deps
```

### Step 3: Let Expo Fix Versions

After initial install, let Expo fix any version mismatches:

```bash
npx expo install --fix
```

This will automatically install the correct versions for SDK 54.

### Alternative: Use Expo Install for All Packages

If you continue having issues, install Expo packages individually:

```bash
npx expo install expo-router expo-location expo-notifications expo-status-bar
npx expo install react-native-safe-area-context react-native-screens
npx expo install @react-native-async-storage/async-storage
```

### Step 4: Create Missing Assets

Create the required asset files in the `assets/` directory:
- `icon.png` (1024x1024px)
- `splash.png` (2048x2048px)
- `adaptive-icon.png` (1024x1024px)
- `favicon.png` (48x48px)
- `notification-icon.png` (96x96px)

Or use: `npx expo-asset-generator`

### Step 5: Start the App

```bash
npm start
```

## Troubleshooting

If you still see dependency conflicts:

1. **Check Expo SDK version:**
   ```bash
   npx expo --version
   ```

2. **Verify package.json:**
   - Ensure `expo` is `~54.0.0`
   - Ensure `react-native` is `0.76.x`

3. **Clear all caches:**
   ```bash
   npm cache clean --force
   npx expo start -c
   ```

4. **Use Yarn instead:**
   ```bash
   yarn install
   ```
