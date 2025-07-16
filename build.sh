#!/bin/bash
set -e

VERSION="1.0.0"
BUILD_DIR="build"
mkdir -p $BUILD_DIR

echo "Building ASAPNotes v$VERSION..."

# Build for different platforms
echo "Building for macOS..."
GOOS=darwin GOARCH=amd64 go build -ldflags="-s -w" -o $BUILD_DIR/asapnotes-macos-amd64
GOOS=darwin GOARCH=arm64 go build -ldflags="-s -w" -o $BUILD_DIR/asapnotes-macos-arm64

echo "Building for Linux..."
GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o $BUILD_DIR/asapnotes-linux-amd64
GOOS=linux GOARCH=arm64 go build -ldflags="-s -w" -o $BUILD_DIR/asapnotes-linux-arm64

echo "Building for Windows..."
GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o $BUILD_DIR/asapnotes-windows-amd64.exe
GOOS=windows GOARCH=arm64 go build -ldflags="-s -w" -o $BUILD_DIR/asapnotes-windows-arm64.exe

echo "Build complete! Files in $BUILD_DIR/"
ls -la $BUILD_DIR/ 