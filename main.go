package main

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"os/exec"
	"runtime"
	"os/signal"
	"syscall"
	"time"
	"sync"
	"sort"
)

type Settings struct {
	NotesFolder string `json:"notes_folder"`
	FontFamily  string `json:"font_family"`
	FontSize    string `json:"font_size"`
}

var settings Settings
var configPath string
var lastHeartbeat time.Time
var heartbeatMutex sync.RWMutex

func init() {
	// Determine config file location
	if isAppBundle() {
		executable, _ := os.Executable()
		appDir := filepath.Dir(filepath.Dir(filepath.Dir(executable)))
		configPath = filepath.Join(appDir, "Contents", "Resources", "config.json")
	} else {
		configPath = "config.json"
	}
	
	// Load settings
	loadSettings()
	
	// Initialize heartbeat
	lastHeartbeat = time.Now()
}

func loadSettings() {
	data, err := os.ReadFile(configPath)
	if err != nil {
		// Default settings
		homeDir, _ := os.UserHomeDir()
		settings = Settings{
			NotesFolder: filepath.Join(homeDir, "Documents", "ASAPNotes"),
			FontFamily:  "monospace",
			FontSize:    "16",
		}
		saveSettings()
		return
	}
	
	json.Unmarshal(data, &settings)
	
	// Ensure notes folder exists
	if _, err := os.Stat(settings.NotesFolder); os.IsNotExist(err) {
		os.MkdirAll(settings.NotesFolder, 0755)
	}
}

func saveSettings() {
	data, _ := json.MarshalIndent(settings, "", "  ")
	os.WriteFile(configPath, data, 0644)
}

func main() {
	// Determine the web files path
	webPath := "web/static"
	if isAppBundle() {
		// If running from app bundle, web files are in Contents/Resources/web/static
		executable, _ := os.Executable()
		appDir := filepath.Dir(filepath.Dir(filepath.Dir(executable))) // Go up from MacOS to app bundle root
		webPath = filepath.Join(appDir, "Contents", "Resources", "web", "static")
	}

	// Ensure notes directory exists
	if _, err := os.Stat(settings.NotesFolder); os.IsNotExist(err) {
		os.MkdirAll(settings.NotesFolder, 0755)
	}

	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir(webPath))))
	http.HandleFunc("/api/folders", handleFolders)
	http.HandleFunc("/api/note", handleNote)
	http.HandleFunc("/api/folder", handleFolder)
	http.HandleFunc("/api/search", handleSearch)
	http.HandleFunc("/api/settings", handleSettings)
	http.HandleFunc("/api/shutdown", handleShutdown)
	http.HandleFunc("/api/heartbeat", handleHeartbeat)
	http.HandleFunc("/", serveIndex)

	// Set up signal handling for graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	log.Println("Server started at http://localhost:8080")
	log.Println("Notes folder:", settings.NotesFolder)
	
	// Start heartbeat monitoring
	go monitorHeartbeat()
	
	go func() {
		url := "http://localhost:8080"
		var err error
		switch runtime.GOOS {
		case "darwin":
			err = exec.Command("open", url).Start()
		case "windows":
			err = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
		default: // linux, freebsd, etc.
			err = exec.Command("xdg-open", url).Start()
		}
		if err != nil {
			log.Println("Failed to open browser:", err)
		}
	}()

	// Start server in a goroutine
	go func() {
		log.Fatal(http.ListenAndServe(":8080", nil))
	}()

	// Wait for shutdown signal
	<-sigChan
	log.Println("Shutting down server...")
}

// monitorHeartbeat checks for inactivity and shuts down after 60 seconds
func monitorHeartbeat() {
	ticker := time.NewTicker(10 * time.Second) // Check every 10 seconds
	defer ticker.Stop()
	
	for range ticker.C {
		heartbeatMutex.RLock()
		last := lastHeartbeat
		heartbeatMutex.RUnlock()
		
		if time.Since(last) > 60*time.Second {
			log.Println("No heartbeat for 60 seconds, shutting down...")
			os.Exit(0)
		}
	}
}

// handleHeartbeat updates the last heartbeat time
func handleHeartbeat(w http.ResponseWriter, r *http.Request) {
	heartbeatMutex.Lock()
	lastHeartbeat = time.Now()
	heartbeatMutex.Unlock()
	w.Write([]byte("OK"))
}

// isAppBundle checks if we're running from a macOS app bundle
func isAppBundle() bool {
	executable, err := os.Executable()
	if err != nil {
		return false
	}
	// Check if the executable is inside a .app bundle
	return strings.Contains(executable, ".app/Contents/MacOS/")
}

func serveIndex(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	
	// Determine the correct path for index.html
	indexPath := "web/static/index.html"
	if isAppBundle() {
		executable, _ := os.Executable()
		appDir := filepath.Dir(filepath.Dir(filepath.Dir(executable))) // Go up from MacOS to app bundle root
		indexPath = filepath.Join(appDir, "Contents", "Resources", "web", "static", "index.html")
	}
	
	data, err := os.ReadFile(indexPath)
	if err != nil {
		w.WriteHeader(500)
		w.Write([]byte("Index file not found."))
		return
	}
	w.Write(data)
}

// --- API Handlers ---

// handleSettings manages app settings
func handleSettings(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		json.NewEncoder(w).Encode(settings)
	} else if r.Method == "POST" {
		var newSettings Settings
		if err := json.NewDecoder(r.Body).Decode(&newSettings); err != nil {
			w.WriteHeader(400)
			return
		}
		
		// Update notes folder if provided
		if newSettings.NotesFolder != "" {
			if _, err := os.Stat(newSettings.NotesFolder); os.IsNotExist(err) {
				if err := os.MkdirAll(newSettings.NotesFolder, 0755); err != nil {
					w.WriteHeader(500)
					w.Write([]byte("Failed to create notes folder"))
					return
				}
			}
			settings.NotesFolder = newSettings.NotesFolder
		}
		
		// Update font settings if provided
		if newSettings.FontFamily != "" {
			settings.FontFamily = newSettings.FontFamily
		}
		if newSettings.FontSize != "" {
			settings.FontSize = newSettings.FontSize
		}
		
		saveSettings()
		w.Write([]byte("OK"))
	}
}

// handleFolders lists folders and notes recursively
func handleFolders(w http.ResponseWriter, r *http.Request) {
	folders, err := walkFolders(settings.NotesFolder)
	if err != nil {
		w.WriteHeader(500)
		w.Write([]byte(err.Error()))
		return
	}
	json.NewEncoder(w).Encode(folders)
}

type Folder struct {
	Name     string    `json:"name"`
	Path     string    `json:"path"`
	Notes    []NoteInfo `json:"notes"`
	Subfolders []Folder `json:"subfolders"`
}

type NoteInfo struct {
	Name string `json:"name"`
	Modified time.Time `json:"modified"`
}

func walkFolders(root string) (Folder, error) {
	// For the root folder, use a generic name and store the relative path
	var folderName string
	var folderPath string
	
	if root == settings.NotesFolder {
		folderName = "Root"
		folderPath = ""
	} else {
		folderName = filepath.Base(root)
		relPath, _ := filepath.Rel(settings.NotesFolder, root)
		folderPath = relPath
	}
	
	folder := Folder{Name: folderName, Path: folderPath}
	entries, err := os.ReadDir(root)
	if err != nil {
		return folder, err
	}
	
	var notes []NoteInfo
	var subfolders []Folder
	
	for _, entry := range entries {
		if entry.IsDir() {
			sub, err := walkFolders(filepath.Join(root, entry.Name()))
			if err == nil {
				subfolders = append(subfolders, sub)
			}
		} else if strings.HasSuffix(entry.Name(), ".md") || strings.HasSuffix(entry.Name(), ".txt") {
			info, err := entry.Info()
			if err == nil {
				notes = append(notes, NoteInfo{
					Name: entry.Name(),
					Modified: info.ModTime(),
				})
			}
		}
	}
	
	// Sort notes by modification time (most recent first)
	sort.Slice(notes, func(i, j int) bool {
		return notes[i].Modified.After(notes[j].Modified)
	})
	
	folder.Notes = notes
	folder.Subfolders = subfolders
	return folder, nil
}

// handleNote loads or saves a note
func handleNote(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Query().Get("path")
	log.Printf("handleNote called with path: %s", path)
	
	if path == "" {
		log.Printf("Path parameter is empty")
		w.WriteHeader(400)
		w.Write([]byte("Path parameter is required"))
		return
	}
	
	// Clean the path to handle any path separators properly
	path = filepath.Clean(path)
	log.Printf("Cleaned path: %s", path)
	
	// Ensure the path is relative to the notes folder
	if filepath.IsAbs(path) {
		log.Printf("Path is absolute, rejecting: %s", path)
		w.WriteHeader(400)
		w.Write([]byte("Path must be relative to notes folder"))
		return
	}
	
	// Join with notes folder to get full path
	fullPath := filepath.Join(settings.NotesFolder, path)
	log.Printf("Full path: %s", fullPath)
	log.Printf("Notes folder: %s", settings.NotesFolder)
	
	// Security check: ensure the resolved path is within the notes folder
	notesFolderAbs, _ := filepath.Abs(settings.NotesFolder)
	fullPathAbs, _ := filepath.Abs(fullPath)
	log.Printf("Notes folder absolute: %s", notesFolderAbs)
	log.Printf("Full path absolute: %s", fullPathAbs)
	
	if !strings.HasPrefix(fullPathAbs, notesFolderAbs) {
		log.Printf("Security check failed: %s is not within %s", fullPathAbs, notesFolderAbs)
		w.WriteHeader(403)
		w.Write([]byte("Access denied"))
		return
	}
	
	if r.Method == "GET" {
		log.Printf("Attempting to read file: %s", fullPath)
		data, err := os.ReadFile(fullPath)
		if err != nil {
			log.Printf("Error reading file: %v", err)
			w.WriteHeader(404)
			w.Write([]byte("Note not found."))
			return
		}
		log.Printf("Successfully read file, size: %d bytes", len(data))
		w.Write(data)
	} else if r.Method == "POST" {
		// Ensure the directory exists
		dir := filepath.Dir(fullPath)
		if err := os.MkdirAll(dir, 0755); err != nil {
			log.Printf("Error creating directory: %v", err)
			w.WriteHeader(500)
			w.Write([]byte("Failed to create directory"))
			return
		}
		
		body, err := io.ReadAll(r.Body)
		if err != nil {
			w.WriteHeader(400)
			return
		}
		err = os.WriteFile(fullPath, body, 0644)
		if err != nil {
			log.Printf("Error writing file: %v", err)
			w.WriteHeader(500)
			w.Write([]byte("Failed to save note"))
			return
		}
		log.Printf("Successfully wrote file: %s", fullPath)
		w.Write([]byte("OK"))
	}
}

// handleFolder creates a new folder
func handleFolder(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		w.WriteHeader(405)
		return
	}
	
	path := r.URL.Query().Get("path")
	if path == "" {
		w.WriteHeader(400)
		w.Write([]byte("Folder path is required"))
		return
	}
	
	// Ensure the path is relative to the notes folder
	if filepath.IsAbs(path) {
		w.WriteHeader(400)
		w.Write([]byte("Folder path must be relative"))
		return
	}
	
	fullPath := filepath.Join(settings.NotesFolder, path)
	
	// Create the folder
	err := os.MkdirAll(fullPath, 0755)
	if err != nil {
		w.WriteHeader(500)
		w.Write([]byte("Failed to create folder"))
		return
	}
	
	w.Write([]byte("OK"))
}

// handleSearch performs a simple full-text search
func handleSearch(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	results := []string{}
	filepath.Walk(settings.NotesFolder, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() || (!strings.HasSuffix(info.Name(), ".md") && !strings.HasSuffix(info.Name(), ".txt")) {
			return nil
		}
		data, err := os.ReadFile(path)
		if err == nil && strings.Contains(strings.ToLower(string(data)), strings.ToLower(query)) {
			// Return relative path from notes folder
			relPath, _ := filepath.Rel(settings.NotesFolder, path)
			results = append(results, relPath)
		}
		return nil
	})
	json.NewEncoder(w).Encode(results)
}

// handleShutdown gracefully shuts down the server
func handleShutdown(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Shutting down..."))
	go func() {
		// Give the response time to be sent
		time.Sleep(100 * time.Millisecond)
		os.Exit(0)
	}()
} 