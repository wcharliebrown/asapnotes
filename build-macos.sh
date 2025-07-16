#!/bin/bash
set -e

echo "Building macOS app bundle..."

# Ensure app bundle structure exists
mkdir -p asapnotes.app/Contents/MacOS
mkdir -p asapnotes.app/Contents/Resources

# Build binary
go build -ldflags="-s -w" -o asapnotes.app/Contents/MacOS/asapnotes

# Copy assets
cp -r web asapnotes.app/Contents/Resources/

echo "macOS app bundle ready!"
echo "You can now move asapnotes.app to /Applications/" 