// --- Settings Management ---
let currentSettings = {};

// --- Theme Toggle ---
const themeBtn = document.getElementById('theme-toggle');
const setTheme = (dark) => {
  document.body.classList.toggle('dark', dark);
  themeBtn.textContent = dark ? '☀️ Dark Mode' : '🌙 Light Mode';
  localStorage.setItem('theme', dark ? 'dark' : 'light');
  
  console.log('Theme changed to:', dark ? 'dark' : 'light');
  
  // Re-apply font settings when theme changes
  if (currentSettings && currentSettings.font_family && currentSettings.font_size) {
    console.log('Re-applying font settings after theme change');
    // Delay slightly to ensure DOM is updated
    setTimeout(() => {
      applyFontSettings(currentSettings.font_family, currentSettings.font_size);
    }, 50);
  }
};
themeBtn.onclick = () => setTheme(!document.body.classList.contains('dark'));
setTheme(localStorage.getItem('theme') === 'dark');

// Font settings functions (moved up to avoid reference errors)
function applyFontSettings(fontFamily, fontSize) {
  console.log('Applying font settings:', fontFamily, fontSize);
  
  // Update CSS variables
  document.documentElement.style.setProperty('--editor-font-family', fontFamily);
  document.documentElement.style.setProperty('--editor-font-size', fontSize + 'px');
  
  // Create or update dynamic style tag for maximum override
  let dynamicStyle = document.getElementById('dynamic-font-style');
  if (!dynamicStyle) {
    dynamicStyle = document.createElement('style');
    dynamicStyle.id = 'dynamic-font-style';
    document.head.appendChild(dynamicStyle);
  }
  
  // Add CSS rules that override everything
  dynamicStyle.textContent = `
    #editor, #preview {
      font-family: ${fontFamily} !important;
      font-size: ${fontSize}px !important;
    }
    body.dark #editor, body.dark #preview {
      font-family: ${fontFamily} !important;
      font-size: ${fontSize}px !important;
    }
    #preview p, #preview h1, #preview h2, #preview h3, #preview h4, #preview h5, #preview h6, #preview li, #preview blockquote, #preview td, #preview th {
      font-family: ${fontFamily} !important;
      font-size: ${fontSize}px !important;
    }
    body.dark #preview p, body.dark #preview h1, body.dark #preview h2, body.dark #preview h3, body.dark #preview h4, body.dark #preview h5, body.dark #preview h6, body.dark #preview li, body.dark #preview blockquote, body.dark #preview td, body.dark #preview th {
      font-family: ${fontFamily} !important;
      font-size: ${fontSize}px !important;
    }
  `;
  
  // Also apply directly to elements as fallback
  const editor = document.getElementById('editor');
  const preview = document.getElementById('preview');
  
  if (editor) {
    editor.style.setProperty('font-family', fontFamily, 'important');
    editor.style.setProperty('font-size', fontSize + 'px', 'important');
  }
  
  if (preview) {
    preview.style.setProperty('font-family', fontFamily, 'important');
    preview.style.setProperty('font-size', fontSize + 'px', 'important');
  }
}

function loadSettings() {
  fetch('/api/settings').then(r => r.json()).then(settings => {
    currentSettings = settings;
    console.log('Notes folder:', settings.notes_folder);
    // Update the notes folder input in the modal
    document.getElementById('notes-folder').value = settings.notes_folder || '';
    
        // Populate font selector with available fonts
    setTimeout(async () => {
      await populateFontSelector();
      
      // Update font settings after populating selector
      setTimeout(() => {
        document.getElementById('font-family').value = settings.font_family || 'monospace';
        document.getElementById('font-size').value = settings.font_size || '16';
        // Apply font settings
        applyFontSettings(settings.font_family || 'monospace', settings.font_size || '16');
        
        // Also apply again after a longer delay to ensure everything is loaded
        setTimeout(() => {
          applyFontSettings(settings.font_family || 'monospace', settings.font_size || '16');
        }, 500);
      }, 200);
    }, 100);
    
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

if (hamburgerMenu) {
  hamburgerMenu.onclick = function() {
    if (settingsModal) {
      settingsModal.style.display = 'block';
    }
  };
}

if (closeModal) {
  closeModal.onclick = function() {
    if (settingsModal) {
      settingsModal.style.display = 'none';
    }
  };
}

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

// Font settings event listeners
const fontFamilySelect = document.getElementById('font-family');
const fontSizeSelect = document.getElementById('font-size');

if (fontFamilySelect) {
  fontFamilySelect.addEventListener('change', function() {
    const newFontFamily = this.value;
    updateFontSettings({ font_family: newFontFamily });
  });
}

if (fontSizeSelect) {
  fontSizeSelect.addEventListener('change', function() {
    const newFontSize = this.value;
    updateFontSettings({ font_size: newFontSize });
  });
}

// Font detection and population
async function populateFontSelector() {
  console.log('Starting font population...');
  
  if (!fontFamilySelect) {
    console.error('Font family select element not found');
    return;
  }

  // Clear existing options
  fontFamilySelect.innerHTML = '';

  try {
    // Get system fonts using FontFace API
    const systemFonts = await getSystemFonts();
    console.log('Found', systemFonts.length, 'system fonts');
    
    // Add generic font families first
    const genericFonts = [
      { name: 'Monospace', value: 'monospace' },
      { name: 'Sans-serif', value: 'sans-serif' },
      { name: 'Serif', value: 'serif' }
    ];
    
    genericFonts.forEach(font => {
      const option = document.createElement('option');
      option.value = font.value;
      option.textContent = font.name;
      fontFamilySelect.appendChild(option);
    });
    
    // Add detected system fonts
    systemFonts.forEach(font => {
      const option = document.createElement('option');
      option.value = font.value;
      option.textContent = font.name;
      option.style.fontFamily = font.value;
      fontFamilySelect.appendChild(option);
    });
    
    console.log('Font population complete. Found', fontFamilySelect.children.length, 'fonts');
  } catch (e) {
    console.error('Error in populateFontSelector:', e);
    // Add basic fallbacks if everything fails
    const fallbacks = [
      { name: 'Monospace', value: 'monospace' },
      { name: 'Sans-serif', value: 'sans-serif' },
      { name: 'Serif', value: 'serif' }
    ];
    fallbacks.forEach(font => {
      const option = document.createElement('option');
      option.value = font.value;
      option.textContent = font.name;
      fontFamilySelect.appendChild(option);
    });
  }
}

// Get all system fonts
async function getSystemFonts() {
  const fonts = [];
  
  // Common font names to test (this is just a starting point)
  const commonFontNames = [
    // Monospace fonts
    'Comic Code', 'Menlo', 'Monaco', 'SF Mono', 'Courier New', 'Consolas', 'Fira Code', 
    'JetBrains Mono', 'Source Code Pro', 'Ubuntu Mono', 'DejaVu Sans Mono', 'Inconsolata',
    'Cascadia Code', 'Victor Mono', 'Operator Mono', 'Dank Mono', 'Hack', 'Roboto Mono',
    'Space Mono', 'IBM Plex Mono', 'Anonymous Pro', 'Liberation Mono', 'PT Mono',
    
    // Sans-serif fonts
    'SF Pro Display', 'Helvetica Neue', 'Arial', 'Helvetica', 'Segoe UI', 'Roboto',
    'Open Sans', 'Lato', 'Source Sans Pro', 'Ubuntu', 'Noto Sans', 'Inter', 'Poppins',
    'Montserrat', 'Raleway', 'Nunito', 'Work Sans', 'Quicksand', 'Rubik', 'DM Sans',
    
    // Serif fonts
    'Times New Roman', 'Georgia', 'Palatino', 'Garamond', 'Baskerville', 'Didot',
    'Playfair Display', 'Merriweather', 'Lora', 'Source Serif Pro', 'Crimson Text',
    'Libre Baskerville', 'PT Serif', 'Noto Serif', 'EB Garamond', 'Alegreya',
    
    // macOS specific fonts
    'SF Pro', 'SF Pro Text', 'SF Mono', 'New York', 'Chalkboard', 'Geneva',
    'Lucida Grande', 'Lucida Sans', 'Optima', 'Palatino', 'Verdana', 'Trebuchet MS',
    
    // Windows specific fonts
    'Calibri', 'Cambria', 'Candara', 'Constantia', 'Corbel', 'Georgia', 'Impact',
    'Tahoma', 'Verdana', 'Webdings', 'Wingdings', 'Wingdings 2', 'Wingdings 3',
    
    // Linux specific fonts
    'DejaVu Sans', 'DejaVu Serif', 'Liberation Sans', 'Liberation Serif',
    'Ubuntu', 'Ubuntu Condensed', 'Ubuntu Mono', 'Noto Sans', 'Noto Serif'
  ];
  
  // Test each font name
  for (const fontName of commonFontNames) {
    try {
      if (await isFontAvailable(fontName)) {
        fonts.push({
          name: fontName,
          value: `'${fontName}', ${getFontCategory(fontName)}`
        });
        console.log('Font available:', fontName);
      }
    } catch (e) {
      console.log('Error testing font:', fontName, e);
    }
  }
  
  // Sort fonts by category and name
  fonts.sort((a, b) => {
    const categoryA = getFontCategory(a.name);
    const categoryB = getFontCategory(b.name);
    
    if (categoryA !== categoryB) {
      // Order: monospace, sans-serif, serif
      const order = { 'monospace': 0, 'sans-serif': 1, 'serif': 2 };
      return order[categoryA] - order[categoryB];
    }
    
    return a.name.localeCompare(b.name);
  });
  
  return fonts;
}

// Determine font category
function getFontCategory(fontName) {
  const monospaceFonts = [
    'Comic Code', 'Menlo', 'Monaco', 'SF Mono', 'Courier New', 'Consolas', 'Fira Code',
    'JetBrains Mono', 'Source Code Pro', 'Ubuntu Mono', 'DejaVu Sans Mono', 'Inconsolata',
    'Cascadia Code', 'Victor Mono', 'Operator Mono', 'Dank Mono', 'Hack', 'Roboto Mono',
    'Space Mono', 'IBM Plex Mono', 'Anonymous Pro', 'Liberation Mono', 'PT Mono'
  ];
  
  const serifFonts = [
    'Times New Roman', 'Georgia', 'Palatino', 'Garamond', 'Baskerville', 'Didot',
    'Playfair Display', 'Merriweather', 'Lora', 'Source Serif Pro', 'Crimson Text',
    'Libre Baskerville', 'PT Serif', 'Noto Serif', 'EB Garamond', 'Alegreya',
    'DejaVu Serif', 'Liberation Serif'
  ];
  
  if (monospaceFonts.includes(fontName)) {
    return 'monospace';
  } else if (serifFonts.includes(fontName)) {
    return 'serif';
  } else {
    return 'sans-serif';
  }
}

async function isFontAvailable(fontName) {
  try {
    // For generic font families, always return true
    if (fontName === 'monospace' || fontName === 'sans-serif' || fontName === 'serif') {
      return true;
    }
    
    // Try using FontFace API first (more reliable)
    if (typeof FontFace !== 'undefined') {
      try {
        const fontFace = new FontFace(fontName, 'normal');
        await fontFace.load();
        return true;
      } catch (e) {
        // FontFace failed, try canvas method
      }
    }
    
    // Fallback to canvas detection
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // Test with a specific string that varies in width between fonts
    const testString = 'mmmmmmmmmm';
    
    // Set initial font (monospace)
    context.font = '12px monospace';
    const initialWidth = context.measureText(testString).width;
    
    // Set test font
    context.font = `12px "${fontName}"`;
    const testWidth = context.measureText(testString).width;
    
    // If the width is different, the font is available
    const isDifferent = Math.abs(testWidth - initialWidth) > 1;
    
    return isDifferent;
  } catch (e) {
    console.log('Error in isFontAvailable for', fontName, ':', e);
    // If there's an error, assume the font is available to be safe
    return true;
  }
}

function updateFontSettings(newSettings) {
  const updatedSettings = { ...currentSettings, ...newSettings };
  fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedSettings)
  })
  .then(response => {
    if (response.ok) {
      // Update local settings
      currentSettings = updatedSettings;
      // Apply the new font settings
      applyFontSettings(currentSettings.font_family || 'monospace', currentSettings.font_size || '16');
      console.log('Font settings updated');
    } else {
      alert('Failed to update font settings');
    }
  })
  .catch(error => {
    console.error('Error updating font settings:', error);
    alert('Failed to update font settings');
  });
}

// --- Load Folders/Notes ---
const foldersDiv = document.getElementById('folders');
let currentPath = '';
let notesTree = {};
let saveTimeout = null;
let expandedFolders = new Set(); // Track which folders are expanded
let selectedFolder = null; // Track the currently selected folder

function renderFolders(folder, basePath = '') {
  const folderPath = basePath ? `${basePath}/${folder.name}` : folder.name;
  const isExpanded = expandedFolders.has(folderPath);
  const hasContent = (folder.notes && folder.notes.length > 0) || (folder.subfolders && folder.subfolders.length > 0);
  const isSelected = selectedFolder === folderPath;
  
  let html = '';
  
  // Only show folder header if it's not the root folder or if it has content
  if (folder.name !== 'ASAPNotes' || hasContent) {
    const folderIcon = hasContent ? (isExpanded ? '📂' : '📁') : '📁';
    const expandIcon = hasContent ? (isExpanded ? '▼' : '▶') : '';
    const selectedClass = isSelected ? ' selected' : '';
    
    html += `<div class='folder-header${selectedClass}' data-folder-path='${folderPath}'>`;
    html += `<span class='folder-toggle' data-folder-path='${folderPath}'>${expandIcon}</span>`;
    html += `<span class='folder-icon'>${folderIcon}</span>`;
    html += `<span class='folder-name'>${folder.name}</span>`;
    html += '</div>';
  }
  
  // Show content if folder is expanded or if it's the root folder
  if (isExpanded || folder.name === 'ASAPNotes') {
    html += '<div class="folder-content">';
    
    // Render notes
    if (folder.notes && folder.notes.length > 0) {
      html += '<ul class="notes-list">';
      folder.notes.forEach(note => {
        const noteName = note.name;
        const notePath = basePath ? `${basePath}/${note.name}` : note.name;
        const modifiedDate = new Date(note.modified).toLocaleDateString();
        html += `<li><a href='#' data-path='${notePath}' title='Modified: ${modifiedDate}'>📄 ${noteName}</a></li>`;
      });
      html += '</ul>';
    }
    
    // Render subfolders
    if (folder.subfolders && folder.subfolders.length > 0) {
      folder.subfolders.forEach(sub => {
        html += `<div class='subfolder'>${renderFolders(sub, folderPath)}</div>`;
      });
    }
    
    html += '</div>';
  }
  
  return html;
}

function loadFolders() {
  fetch('/api/folders').then(r => r.json()).then(tree => {
    notesTree = tree;
    foldersDiv.innerHTML = renderFolders(tree);
    
    // Add event listeners for folder toggles
    addFolderToggleListeners();
  });
}

function addFolderToggleListeners() {
  // Add click handlers for folder toggles
  document.querySelectorAll('.folder-toggle').forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const folderPath = toggle.dataset.folderPath;
      toggleFolder(folderPath);
    });
  });
  
  // Add click handlers for folder headers (to expand/collapse and select)
  document.querySelectorAll('.folder-header').forEach(header => {
    header.addEventListener('click', (e) => {
      if (e.target.classList.contains('folder-toggle')) return; // Skip if clicking toggle
      const folderPath = header.dataset.folderPath;
      
      // Select the folder
      selectedFolder = folderPath;
      updateCurrentFolderDisplay();
      
      // Toggle expansion if the folder has content
      const hasContent = header.querySelector('.folder-toggle').textContent !== '';
      if (hasContent) {
        toggleFolder(folderPath);
      } else {
        // Just re-render to show selection
        foldersDiv.innerHTML = renderFolders(notesTree);
        addFolderToggleListeners();
      }
    });
  });
}

function updateCurrentFolderDisplay() {
  const currentFolderDiv = document.getElementById('current-folder');
  if (selectedFolder) {
    currentFolderDiv.textContent = `📁 ${selectedFolder}`;
    currentFolderDiv.style.display = 'block';
  } else {
    currentFolderDiv.style.display = 'none';
  }
}

function toggleFolder(folderPath) {
  if (expandedFolders.has(folderPath)) {
    expandedFolders.delete(folderPath);
  } else {
    expandedFolders.add(folderPath);
  }
  
  // Re-render the folders to show the updated state
  foldersDiv.innerHTML = renderFolders(notesTree);
  addFolderToggleListeners();
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
function renderPreview() {
  preview.innerHTML = markdownToHtml(editor.value);
}
editor.addEventListener('input', () => {
  renderPreview();
  autoSave(); // Trigger auto-save on every input
});

function markdownToHtml(md) {
  // Enhanced Markdown: headings, bold, italics, code, links, lists, images, code blocks, blockquotes, tables, strikethrough, task lists

  // Step 1: Extract code blocks (fenced with ```)
  const codeBlocks = [];
  md = md.replace(/```([\s\S]*?)```/g, function(match, code) {
    codeBlocks.push(code);
    return `{{CODEBLOCK_${codeBlocks.length - 1}}}`;
  });

  // Step 2: Split into blocks by double newlines
  const blocks = md.split(/\n{2,}/);
  const htmlBlocks = blocks.map(block => {
    // Restore code blocks
    if (/\{\{CODEBLOCK_(\d+)\}\}/.test(block)) {
      return block.replace(/\{\{CODEBLOCK_(\d+)\}\}/g, function(_, idx) {
        return `<pre><code>${codeBlocks[idx].replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;
      });
    }
    // If block starts with a block element, don't wrap in <p> or add <br>
    if (/^(\s*#|\s*>|\s*([-*+] |\d+\. )|\s*- \[[ xX]\]|\s*\|)/.test(block)) {
      return block
        // Headings
        .replace(/^###### (.*$)/gim, '<h6>$1</h6>')
        .replace(/^##### (.*$)/gim, '<h5>$1</h5>')
        .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        // Blockquotes
        .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
        // Tables
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
        .replace(/^\s*- \[([ xX])\] (.*)$/gim, '<div class="task-item"><input type="checkbox" $1 disabled> $2</div>')
        // Lists
        .replace(/^\s*[-*+] (.*)$/gim, '<li>$1</li>');
    } else {
      // Otherwise, treat as paragraph and convert single newlines to <br>
      return '<p>' + block
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>')
        .replace(/\s{2,}/g, ' ')
        + '</p>';
    }
  });

  let html = htmlBlocks.join('');

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
  
  // Get current folder context from selected folder or use root
  const currentFolder = getCurrentFolderContext();
  const path = currentFolder ? `${currentFolder}/${name}` : name;
  
  fetch(`/api/note?path=${encodeURIComponent(path)}`, {
    method: 'POST',
    body: ''
  }).then(() => {
    loadFolders();
    loadNote(path);
  });
};

// --- New Folder Button ---
const newFolderBtn = document.getElementById('new-folder');
newFolderBtn.onclick = function() {
  let name = prompt('Enter new folder name:');
  if (!name) return;
  name = name.trim();
  
  // Validate folder name
  name = name.replace(/[^a-zA-Z0-9 _\-]/g, '').trim();
  if (!name) return alert('Invalid folder name.');
  
  // Get current folder context
  const currentFolder = getCurrentFolderContext();
  const folderPath = currentFolder ? `${currentFolder}/${name}` : name;
  
  // Create the folder
  fetch(`/api/folder?path=${encodeURIComponent(folderPath)}`, {
    method: 'POST'
  }).then(response => {
    if (response.ok) {
      loadFolders();
      // Expand the parent folder to show the new folder
      if (currentFolder) {
        expandedFolders.add(currentFolder);
      }
    } else {
      alert('Failed to create folder');
    }
  }).catch(() => {
    alert('Failed to create folder');
  });
};

// Helper function to get current folder context
function getCurrentFolderContext() {
  // Check if there's a selected folder (could be enhanced with selection tracking)
  // For now, return null (root folder)
  return selectedFolder;
}

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
// Apply default font settings immediately
applyFontSettings('monospace', '16');

// Also ensure font settings are applied when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  applyFontSettings('monospace', '16');
  
  // Fallback: populate font selector if it's still empty after 2 seconds
  setTimeout(async () => {
    if (fontFamilySelect && fontFamilySelect.children.length <= 1) {
      console.log('Fallback: populating font selector');
      await populateFontSelector();
    }
  }, 2000);
});

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