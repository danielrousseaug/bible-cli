#!/bin/bash
# Helper script to clean and reinstall npm dependencies
# Addresses ENOTEMPTY errors on WSL2 systems

echo "🧹 Cleaning existing installation..."

# Remove node_modules with force
if [ -d "node_modules" ]; then
    echo "Removing node_modules..."
    chmod -R u+w node_modules 2>/dev/null || true
    rm -rf node_modules
fi

# Remove package-lock.json
if [ -f "package-lock.json" ]; then
    echo "Removing package-lock.json..."
    rm -f package-lock.json
fi

# Clear npm cache
echo "Clearing npm cache..."
npm cache clean --force

# Verify cleanup
if [ -d "node_modules" ]; then
    echo "❌ Error: node_modules still exists after cleanup"
    echo "Try closing all editors/terminals and run this script again"
    exit 1
fi

echo "✅ Cleanup complete"
echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Installation successful!"
    npm audit
else
    echo ""
    echo "❌ Installation failed"
    echo "Try running: sudo npm install --unsafe-perm=true --allow-root"
    exit 1
fi
