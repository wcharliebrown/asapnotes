// --- Theme Toggle ---
const themeBtn = document.getElementById('theme-toggle');
const setTheme = (dark) => {
  document.body.classList.toggle('dark', dark);
  themeBtn.textContent = dark ? '☀️ Dark Mode' : '🌙 Light Mode';
  localStorage.setItem('theme', dark ? 'dark' : 'light');
};
themeBtn.onclick = () => setTheme(!document.body.classList.contains('dark'));
setTheme(localStorage.getItem('theme') === 'dark');

// --- Settings Management ---
let currentSettings = {};
function loadSettings() {
  fetch('/api/settings').then(r => r.json()).then(settings => {
    currentSettings = settings;
    console.log('Notes folder:', settings.notes_folder);
    // Update the notes folder input in the modal
    document.getElementById('notes-folder').value = settings.notes_folder || '';
    // Load folders after settings are loaded
    loadFolders();
  }).catch(error => {
    console.error('Error loading settings:', error);
    // Still try to load folders even if settings fail
    loadFolders();
  });
}

// --- Modal Management ---
const hamburgerMenu = document.getElementById('hamburger-menu');
const settingsModal = document.getElementById('settings-modal');
const closeModal = document.getElementById('close-modal');
const updateFolderBtn = document.getElementById('update-folder');

hamburgerMenu.onclick = function() {
  settingsModal.style.display = 'block';
};

closeModal.onclick = function() {
  settingsModal.style.display = 'none';
};

// Close modal when clicking outside of it
window.onclick = function(event) {
  if (event.target === settingsModal) {
    settingsModal.style.display = 'none';
  }
};

// Update folder button
updateFolderBtn.onclick = function() {
  const newFolder = document.getElementById('notes-folder').value.trim();
  if (newFolder && newFolder !== currentSettings.notes_folder) {
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes_folder: newFolder })
    })
    .then(response => {
      if (response.ok) {
        // Update local settings
        currentSettings.notes_folder = newFolder;
        console.log('Notes folder updated to:', newFolder);
        // Reload folders to show new location
        loadFolders();
        alert('Notes folder updated successfully!');
      } else {
        alert('Failed to update notes folder');
      }
    })
    .catch(error => {
      console.error('Error updating settings:', error);
      alert('Failed to update notes folder');
    });
  }
};

// --- Load Folders/Notes ---
const foldersDiv = document.getElementById('folders');
let currentPath = '';
let notesTree = {};
let saveTimeout = null;

function renderFolders(folder, basePath = '') {
  let html = `<div class='folder'><b>${folder.name}</b></div>`;
  if (folder.notes && folder.notes.length > 0) {
    html += '<ul>';
    folder.notes.forEach(note => {
      const noteName = note.name;
      const modifiedDate = new Date(note.modified).toLocaleDateString();
      html += `<li><a href='#' data-path='${note.name}' title='Modified: ${modifiedDate}'>${noteName}</a></li>`;
    });
    html += '</ul>';
  }
  if (folder.subfolders) {
    html += folder.subfolders.map(sub => `<div class='subfolder'>${renderFolders(sub, sub.path)}</div>`).join('');
  }
  return html;
}

function loadFolders() {
  fetch('/api/folders').then(r => r.json()).then(tree => {
    notesTree = tree;
    foldersDiv.innerHTML = renderFolders(tree);
  });
}

foldersDiv.onclick = (e) => {
  if (e.target.tagName === 'A') {
    e.preventDefault();
    loadNote(e.target.dataset.path);
  }
};

// --- Load/Save Note with Auto-save ---
const editor = document.getElementById('editor');
let currentNotePath = '';

function loadNote(path) {
  fetch(`/api/note?path=${encodeURIComponent(path)}`)
    .then(r => r.text())
    .then(text => {
      editor.value = text;
      currentNotePath = path;
      renderPreview();
    });
}

function autoSave() {
  if (!currentNotePath) return;
  
  // Clear existing timeout
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  
  // Set new timeout for auto-save (1 second delay)
  saveTimeout = setTimeout(() => {
    fetch(`/api/note?path=${encodeURIComponent(currentNotePath)}`, {
      method: 'POST',
      body: editor.value
    }).then(() => {
      console.log('Auto-saved:', currentNotePath);
    });
  }, 1000);
}

// --- Markdown Preview ---
const preview = document.getElementById('preview');
editor.addEventListener('input', () => {
  renderPreview();
  autoSave(); // Trigger auto-save on every input
});

function renderPreview() {
  preview.innerHTML = markdownToHtml(editor.value);
}

function markdownToHtml(md) {
  // Enhanced Markdown: headings, bold, italics, code, links, lists, images, code blocks, blockquotes, tables, strikethrough, task lists
  
  let html = md
    // Headings
    .replace(/^###### (.*$)/gim, '<h6>$1</h6>')
    .replace(/^##### (.*$)/gim, '<h5>$1</h5>')
    .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    
    // Code blocks (```code```)
    .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
    
    // Blockquotes
    .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
    
    // Tables (basic support)
    .replace(/\|(.+)\|/g, function(match, content) {
      const cells = content.split('|').map(cell => cell.trim());
      return '<tr>' + cells.map(cell => `<td>${cell}</td>`).join('') + '</tr>';
    })
    .replace(/(<tr>.*<\/tr>)/g, '<table>$1</table>')
    
    // Images
    .replace(/!\[(.*?)\]\((.*?)\)/gim, '<img src="$2" alt="$1" style="max-width: 100%; height: auto;">')
    
    // Links
    .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank">$1</a>')
    
    // Text formatting
    .replace(/\*\*(.*?)\*\*/gim, '<b>$1</b>')
    .replace(/\*(.*?)\*/gim, '<i>$1</i>')
    .replace(/~~(.*?)~~/gim, '<del>$1</del>')
    .replace(/`([^`]+)`/gim, '<code>$1</code>')
    
    // Task lists
    .replace(/^\s*- \[([ x])\] (.*)$/gim, '<div class="task-item"><input type="checkbox" $1 disabled> $2</div>')
    
    // Lists
    .replace(/^\s*[-*+] (.*)$/gim, '<li>$1</li>')
    
    // Paragraphs
    .replace(/\n{2,}/g, '</p><p>');
  
  html = '<p>' + html + '</p>';
  html = html.replace(/<p><\/p>/g, '');
  
  // Clean up table structure
  html = html.replace(/<table><tr>/g, '<table><tbody><tr>');
  html = html.replace(/<\/tr><\/table>/g, '</tr></tbody></table>');
  
  return html;
}

// --- Search ---
const search = document.getElementById('search');
search.addEventListener('input', function() {
  const q = search.value.trim();
  if (!q) {
    loadFolders();
    return;
  }
  fetch(`/api/search?q=${encodeURIComponent(q)}`)
    .then(r => r.json())
    .then(results => {
      // Show only matching notes
      let html = '<ul>';
      results.forEach(path => {
        const noteName = path;
        html += `<li><a href='#' data-path='${path}'>${noteName}</a></li>`;
      });
      html += '</ul>';
      foldersDiv.innerHTML = html;
    });
});

// --- New Note Button ---
const newNoteBtn = document.getElementById('new-note');
newNoteBtn.onclick = function() {
  let name = prompt('Enter new note name (include .md or .txt extension):');
  if (!name) return;
  name = name.trim();
  
  // Add .md extension if no extension is provided
  if (!name.includes('.')) {
    name += '.md';
  }
  
  // Validate extension
  if (!name.endsWith('.md') && !name.endsWith('.txt')) {
    alert('Please use .md or .txt extension');
    return;
  }
  
  // Validate filename - fix regex by escaping hyphen
  name = name.replace(/[^a-zA-Z0-9 _\-\.]/g, '').trim();
  if (!name) return alert('Invalid name.');
  
  const path = `${name}`;
  fetch(`/api/note?path=${encodeURIComponent(path)}`, {
    method: 'POST',
    body: ''
  }).then(() => {
    loadFolders();
    loadNote(path);
  });
};

// --- Close App Button ---
const closeAppBtn = document.getElementById('close-app');
closeAppBtn.onclick = function() {
  if (confirm('Are you sure you want to close ASAPNotes?')) {
    fetch('/api/shutdown', { method: 'POST' })
      .then(() => {
        // Close the browser tab/window
        window.close();
        // Fallback: if window.close() doesn't work, show a message
        setTimeout(() => {
          alert('ASAPNotes has been closed. You can close this browser tab.');
        }, 1000);
      })
      .catch(() => {
        alert('ASAPNotes has been closed. You can close this browser tab.');
      });
  }
};

// --- Initialize ---
loadSettings();

// --- Resizable Panels ---
function initResizers() {
  const resizer1 = document.getElementById('resizer-1');
  const resizer2 = document.getElementById('resizer-2');
  const sidebar = document.getElementById('sidebar');
  const editorContainer = document.getElementById('editor-container');
  const preview = document.getElementById('preview');

  function initResizer(resizer, leftPanel, rightPanel) {
    let isResizing = false;
    let startX;
    let startLeftWidth;
    let startRightWidth;

    resizer.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startLeftWidth = leftPanel.offsetWidth;
      startRightWidth = rightPanel.offsetWidth;
      
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      
      const deltaX = e.clientX - startX;
      const newLeftWidth = startLeftWidth + deltaX;
      const newRightWidth = startRightWidth - deltaX;
      
      // Apply minimum widths
      const minWidth = 200;
      if (newLeftWidth >= minWidth && newRightWidth >= minWidth) {
        if (leftPanel === sidebar) {
          // Sidebar resizer
          leftPanel.style.width = newLeftWidth + 'px';
        } else {
          // Editor/preview resizer
          leftPanel.style.flexBasis = newLeftWidth + 'px';
          rightPanel.style.flexBasis = newRightWidth + 'px';
        }
      }
    });

    document.addEventListener('mouseup', () => {
      isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });
  }

  // Initialize both resizers
  initResizer(resizer1, sidebar, editorContainer);
  initResizer(resizer2, editorContainer, preview);
}

// Initialize resizers after DOM is loaded
document.addEventListener('DOMContentLoaded', initResizers);

// --- Heartbeat System ---
let heartbeatInterval = null;

function startHeartbeat() {
  // Send heartbeat every 30 seconds
  heartbeatInterval = setInterval(() => {
    fetch('/api/heartbeat', { method: 'POST' })
      .catch(err => {
        console.log('Heartbeat failed, server may be shutting down');
      });
  }, 30000); // 30 seconds
  
  // Send initial heartbeat
  fetch('/api/heartbeat', { method: 'POST' });
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// Start heartbeat when page loads
startHeartbeat();

// Stop heartbeat when page is unloaded (browser closed/refreshed)
window.addEventListener('beforeunload', stopHeartbeat);
window.addEventListener('unload', stopHeartbeat);

// Also stop heartbeat when the page becomes hidden (tab switch, minimize)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopHeartbeat();
  } else {
    startHeartbeat();
  }
}); 