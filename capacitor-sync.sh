#!/bin/bash

echo "🔨 Building project..."
npm run build

echo "📁 Copying files to www..."
rm -rf www/*
cp -r dist/public/* www/

echo "🔄 Syncing with Capacitor..."
npx cap sync

echo "✅ Capacitor sync completed!"