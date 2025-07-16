# ASAPNotes

A lightweight, Markdown-first note-taking desktop application built in Go with a web-based interface. Features local plain-text storage, real-time auto-save, intelligent auto-shutdown, and a distraction-free writing environment.

## ✨ Features

### 📝 **Markdown-First Writing**
- **Full Markdown Support**: Write in Markdown with live preview
- **Auto-Save**: Notes save automatically as you type (1-second delay)
- **Real-Time Preview**: See your formatted content as you write
- **Complete Syntax**: Headings, lists, tables, code blocks, images, links, blockquotes, task lists, strikethrough
- **Multiple Formats**: Support for both `.md` and `.txt` files

### 📁 **Flexible Storage**
- **Configurable Location**: Set your notes folder anywhere on your system
- **Persistent Settings**: Your folder choice is remembered between sessions
- **Plain Text**: All notes stored as `.md` and `.txt` files for maximum compatibility
- **Folder Organization**: Create nested folders and subfolders

### 🔍 **Smart Search**
- **Real-Time Search**: Find notes instantly as you type
- **Full-Text Search**: Search through note content, not just titles
- **Live Results**: See matching notes immediately
- **Multi-Format**: Search across both `.md` and `.txt` files

### 🎨 **User Experience**
- **Dark/Light Mode**: Toggle between themes with one click
- **Distraction-Free**: Clean, minimal interface
- **Cross-Platform**: Works on macOS, Windows, and Linux
- **Lightweight**: No external dependencies, fast startup
- **Auto-Shutdown**: App automatically closes when browser windows are closed
- **Resizable Panels**: Adjust sidebar, editor, and preview widths
- **Settings Modal**: Clean hamburger menu interface for all settings

### 🧠 **Intelligent Behavior**
- **Heartbeat System**: App monitors browser activity and auto-shuts down after 60 seconds of inactivity
- **Background Operation**: Runs silently without dock icon (macOS)
- **Graceful Shutdown**: Saves all changes before closing
- **File Sorting**: Notes sorted by modification time (most recent first)

## 🚀 Quick Start

### Prerequisites
- **Go 1.16 or later** - [Download Go](https://golang.org/dl/)

### Quick Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/asapnote.git
   cd asapnote
   ```

2. **Build and run**:
   ```bash
   go build -o asapnotes
   ./asapnotes
   ```

3. **Open your browser** to `http://localhost:8080`

## 🛠️ Building from Source

### Development Setup

1. **Install Go** (if not already installed):
   ```bash
   # macOS (using Homebrew)
   brew install go
   
   # Linux (Ubuntu/Debian)
   sudo apt-get install golang-go
   
   # Windows
   # Download from https://golang.org/dl/
   ```

2. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/asapnote.git
   cd asapnote
   ```

3. **Verify Go installation**:
   ```bash
   go version
   ```

### Building for Different Platforms

#### **macOS**
```bash
# Build for current macOS architecture
go build -o asapnotes

# Build for specific architecture
GOOS=darwin GOARCH=amd64 go build -o asapnotes-amd64
GOOS=darwin GOARCH=arm64 go build -o asapnotes-arm64

# Create universal binary (requires both architectures)
lipo -create asapnotes-amd64 asapnotes-arm64 -output asapnotes-universal
```

#### **Windows**
```bash
# Build for Windows
GOOS=windows GOARCH=amd64 go build -o asapnotes.exe

# Build for Windows ARM64
GOOS=windows GOARCH=arm64 go build -o asapnotes-arm64.exe
```

#### **Linux**
```bash
# Build for Linux
GOOS=linux GOARCH=amd64 go build -o asapnotes

# Build for Linux ARM64
GOOS=linux GOARCH=arm64 go build -o asapnotes-arm64
```

### Creating macOS App Bundle

1. **Create the app bundle structure**:
   ```bash
   mkdir -p asapnotes.app/Contents/MacOS
   mkdir -p asapnotes.app/Contents/Resources
   ```

2. **Build the binary**:
   ```bash
   go build -o asapnotes.app/Contents/MacOS/asapnotes
   ```

3. **Copy web assets**:
   ```bash
   cp -r web asapnotes.app/Contents/Resources/
   ```

4. **Create Info.plist** (if not exists):
   ```bash
   cat > asapnotes.app/Contents/Info.plist << 'EOF'
   <?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
   <plist version="1.0">
   <dict>
       <key>CFBundleName</key>
       <string>ASAPNotes</string>
       <key>CFBundleDisplayName</key>
       <string>ASAPNotes</string>
       <key>CFBundleIdentifier</key>
       <string>com.yourcompany.asapnotes</string>
       <key>CFBundleVersion</key>
       <string>1.0</string>
       <key>CFBundleExecutable</key>
       <string>asapnotes</string>
       <key>CFBundlePackageType</key>
       <string>APPL</string>
       <key>LSUIElement</key>
       <true/>
       <key>LSBackgroundOnly</key>
       <true/>
   </dict>
   </plist>
   EOF
   ```

5. **Add app icon** (optional):
   ```bash
   # Convert PNG to .icns and place in Contents/Resources/
   # Then add to Info.plist:
   # <key>CFBundleIconFile</key>
   # <string>asapnotes.icns</string>
   ```

6. **Install to Applications**:
   ```bash
   mv asapnotes.app /Applications/
   ```

### Building for Distribution

#### **Create Release Builds**
```bash
# Create a build script
cat > build.sh << 'EOF'
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
EOF

chmod +x build.sh
./build.sh
```

#### **Create macOS App Bundle for Distribution**
```bash
# Build script for macOS app bundle
cat > build-macos.sh << 'EOF'
#!/bin/bash
set -e

echo "Building macOS app bundle..."

# Build binary
go build -ldflags="-s -w" -o asapnotes.app/Contents/MacOS/asapnotes

# Copy assets
cp -r web asapnotes.app/Contents/Resources/

# Create DMG (optional, requires create-dmg)
# brew install create-dmg
# create-dmg \
#   --volname "ASAPNotes" \
#   --window-pos 200 120 \
#   --window-size 600 300 \
#   --icon-size 100 \
#   --icon "asapnotes.app" 175 120 \
#   --hide-extension "asapnotes.app" \
#   --app-drop-link 425 120 \
#   "ASAPNotes.dmg" \
#   "asapnotes.app"

echo "macOS app bundle ready!"
EOF

chmod +x build-macos.sh
./build-macos.sh
```

## 📖 Usage

### Creating Notes
- Click the **"New Note"** button in the sidebar
- Enter a name with `.md` or `.txt` extension (e.g., `MyNote.md` or `Todo.txt`)
- Start typing - notes auto-save as you write

### Organizing Notes
- Use the **☰ hamburger menu** to open settings
- Change your notes folder location
- Create subfolders in your notes directory for organization
- Notes are stored as plain `.md` and `.txt` files

### Closing the App
- Click the **"Close App"** button in settings
- Or simply close all browser windows - the app will auto-shutdown after 60 seconds

### Markdown Features

#### Text Formatting
- `**bold**` → **bold**
- `*italic*` → *italic*
- `~~strikethrough~~` → ~~strikethrough~~
- `` `code` `` → `code`

#### Headings
- `# Heading 1`
- `## Heading 2`
- `### Heading 3`
- `#### Heading 4`
- `##### Heading 5`
- `###### Heading 6`

#### Lists
- `- item` or `* item` or `+ item` → bullet lists
- `- [ ] task` → unchecked task
- `- [x] task` → checked task

#### Links and Images
- `[text](url)` → [text](url)
- `![alt](image-url)` → displays image

#### Code Blocks
- ```code``` → formatted code block
- `code` → inline code

#### Blockquotes
- `> quote` → blockquote

#### Tables
```
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
```

### Search
- Type in the search box to find notes instantly
- Search works across all note content
- Results update in real-time

### Themes
- Click the **☰ hamburger menu** → Theme button to toggle dark/light mode
- Your theme preference is saved

### Resizable Panels
- Drag the dividers between sidebar, editor, and preview to resize
- Minimum 200px width enforced for usability

## 🛠️ Development

### Project Structure
```
asapnote/
├── main.go              # Go server and API
├── web/static/          # Frontend assets
│   ├── index.html       # Main UI
│   ├── style.css        # Styles and themes
│   └── app.js           # Frontend logic
├── notes/               # Default notes folder
├── config.json          # App settings
├── build.sh             # Build script for all platforms
├── build-macos.sh       # macOS app bundle script
└── asapnotes.app/       # macOS app bundle
    └── Contents/
        ├── MacOS/       # Go binary
        ├── Resources/   # Web files and assets
        └── Info.plist   # App metadata
```

### API Endpoints
- `GET /api/folders` - List notes and folders
- `GET /api/note?path=file.md` - Load a note
- `POST /api/note?path=file.md` - Save a note
- `GET /api/search?q=query` - Search notes
- `GET /api/settings` - Get app settings
- `POST /api/settings` - Update app settings
- `POST /api/shutdown` - Gracefully shut down the server
- `POST /api/heartbeat` - Update heartbeat (auto-shutdown system)

### Development Workflow

1. **Make changes** to Go code or web assets
2. **Rebuild** the binary:
   ```bash
   go build -o asapnotes
   ```
3. **Test locally**:
   ```bash
   ./asapnotes
   ```
4. **For app bundle**, also copy web files:
   ```bash
   go build -o asapnotes.app/Contents/MacOS/asapnotes
   cp -r web asapnotes.app/Contents/Resources/
   ```

### Debugging

#### **Enable Debug Logging**
```go
// Add to main.go for more verbose output
log.SetFlags(log.LstdFlags | log.Lshortfile)
```

#### **Check File Permissions**
```bash
# Ensure notes directory is writable
chmod 755 notes/
```

#### **Test API Endpoints**
```bash
# Test folder listing
curl http://localhost:8080/api/folders

# Test note creation
curl -X POST 'http://localhost:8080/api/note?path=test.md' --data 'Hello World'

# Test settings
curl http://localhost:8080/api/settings
```

## 🎯 Design Philosophy

- **Simplicity**: Clean, distraction-free interface
- **Speed**: Instant search and auto-save
- **Portability**: Plain text files work everywhere
- **Privacy**: All data stays local on your machine
- **Lightweight**: No external dependencies
- **Intelligent**: Auto-shutdown when not needed
- **User-Friendly**: Works like a native desktop app

## 🔧 Technical Details

### Auto-Save System
- Notes save automatically 1 second after you stop typing
- Debounced to prevent excessive file writes
- Works seamlessly in the background

### Heartbeat System
- Browser sends heartbeat every 30 seconds
- Server monitors for heartbeats every 10 seconds
- Auto-shutdown after 60 seconds of inactivity
- Detects browser close, tab switch, and page unload

### Settings Persistence
- Notes folder location saved in `config.json`
- Theme preference saved in browser localStorage
- Settings persist between app launches

### File Support
- **Markdown (.md)**: Full Markdown rendering with live preview
- **Plain Text (.txt)**: Simple text editing without formatting
- **Auto-detection**: App handles both file types seamlessly

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Guidelines
- **Go code**: Follow standard Go conventions
- **Frontend**: Use vanilla HTML/CSS/JavaScript (no frameworks)
- **Testing**: Test on multiple platforms when possible
- **Documentation**: Update README for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with Go standard library (no external dependencies)
- Web interface using vanilla HTML/CSS/JavaScript
- Markdown parsing implemented from scratch
- Cross-platform compatibility
- Intelligent auto-shutdown system

## 📋 Changelog

### v1.0.0
- Initial release
- Markdown and plain text file support
- Auto-save functionality
- Dark/light theme support
- Resizable panels
- Settings modal with hamburger menu
- Intelligent auto-shutdown
- Cross-platform support

---

**ASAPNotes** - Write notes as fast as you think, with intelligent behavior that adapts to your workflow. 