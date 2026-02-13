# Fix Dependency Conflicts - Step by Step

## The Problem
- `expo-router@4.0.0` requires `expo-constants@~17.0.8`
- But Expo SDK 54 requires `expo-constants@~18.0.0`
- This creates a peer dependency conflict

## Solution: Use Expo's Install Command

Expo's `npx expo install` command automatically resolves compatible versions for your SDK version.

### Step 1: Clean Install (Run in Terminal)

```bash
cd /Users/mostarlens/Desktop/Jibni-Expo/Frontend

# Remove old dependencies
rm -rf node_modules package-lock.json

# Install with legacy peer deps to bypass conflicts
npm install --legacy-peer-deps
```

### Step 2: Let Expo Fix Versions

```bash
# This will automatically install correct versions for SDK 54
npx expo install --fix
```

### Step 3: Install Expo Packages Individually (If Step 2 doesn't work)

```bash
# Install core Expo packages with correct versions
npx expo install expo-router
npx expo install expo-constants
npx expo install expo-location
npx expo install expo-notifications
npx expo install expo-status-bar
npx expo install react-native-safe-area-context
npx expo install react-native-screens
npx expo install @react-native-async-storage/async-storage
```

### Step 4: Verify Installation

```bash
# Check versions
npx expo --version
npm list expo-router expo-constants
```

### Step 5: Create Missing Assets

Create these files in the `assets/` directory:
- `icon.png` (1024x1024px)
- `splash.png` (2048x2048px)
- `adaptive-icon.png` (1024x1024px)
- `favicon.png` (48x48px)
- `notification-icon.png` (96x96px)

Or use: `npx expo-asset-generator`

### Step 6: Start the App

```bash
npm start
```

## Alternative: Use Yarn

If npm continues to have issues:

```bash
# Install yarn if you don't have it
npm install -g yarn

# Install dependencies
yarn install

# Let Expo fix versions
npx expo install --fix
```

## If All Else Fails

If you still have conflicts, you can temporarily use SDK 51:

1. Change `expo` in package.json to `~51.0.0`
2. Change `react-native` to `0.74.0`
3. Run `npx expo install --fix`

But SDK 54 is recommended for compatibility with the latest Expo Go app.
