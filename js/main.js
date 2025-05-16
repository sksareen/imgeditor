/**
 * Image Editor - Main Application File
 */

// Import modules
import { CanvasManager } from './components/CanvasManager.js';
import { ImageManager } from './components/ImageManager.js';
import { TextManager } from './components/TextManager.js';
import { HistoryManager } from './utils/HistoryManager.js';
import { CommandPalette } from './components/CommandPalette.js';
import { ClipboardManager } from './utils/ClipboardManager.js';
import { ShortcutManager } from './utils/ShortcutManager.js';
import { ToastManager } from './utils/ToastManager.js';
import { ThemeManager } from './utils/ThemeManager.js';

// Application state
let app = null;

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

/**
 * Initializes the application
 */
function initApp() {
  // Create application instance
  app = {
    // Component managers
    canvas: new CanvasManager('editor-canvas'),
    image: new ImageManager(),
    text: new TextManager(),
    history: new HistoryManager(),
    command: new CommandPalette(),
    clipboard: new ClipboardManager(),
    shortcuts: new ShortcutManager(),
    toast: new ToastManager(),
    theme: new ThemeManager(),
    
    // Application state
    state: {
      selectedElement: null,
      elementType: null, // 'image' or 'text'
      isDragging: false,
      isResizing: false,
      isCropping: false,
      aspectRatio: '1:1',
    },
    
    // Initialize the application
    init() {
      // Initialize all components
      this.canvas.init(this);
      this.image.init(this);
      this.text.init(this);
      this.history.init(this);
      this.command.init(this);
      this.clipboard.init(this);
      this.shortcuts.init(this);
      this.toast.init(this);
      this.theme.init(this);
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Initial canvas aspect ratio
      this.setAspectRatio('1:1');
      
      // Initialize application state
      this.loadInitialState();
      
      console.log('Image Editor initialized successfully');
    },
    
    /**
     * Set up application-wide event listeners
     */
    setupEventListeners() {
      // Reset button
      document.getElementById('reset-btn')?.addEventListener('click', () => {
        this.reset();
      });
      
      // Export button
      document.getElementById('export-btn')?.addEventListener('click', () => {
        this.exportImage();
      });
      
      // Dark mode toggle button
      document.getElementById('dark-mode-toggle')?.addEventListener('click', () => {
        this.theme.toggle();
      });
      
      // Copy to clipboard button
      document.getElementById('copy-clipboard-btn')?.addEventListener('click', () => {
        this.clipboard.copyCanvasToClipboard();
      });
      
      // Command palette button
      document.getElementById('command-palette-btn')?.addEventListener('click', () => {
        this.command.toggle();
      });
      
      // Aspect ratio toggles
      const aspectRatioToggles = document.querySelectorAll('.aspect-toggle');
      aspectRatioToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
          this.setAspectRatio(toggle.dataset.ratio);
        });
      });
      
      // Copyright year
      const copyrightYearElement = document.getElementById('copyright-year');
      if (copyrightYearElement) {
        copyrightYearElement.textContent = new Date().getFullYear();
      }
    },
    
    /**
     * Set canvas aspect ratio
     * @param {string} ratio - The aspect ratio in format "width:height"
     */
    setAspectRatio(ratio) {
      this.state.aspectRatio = ratio;
      this.canvas.setAspectRatio(ratio);
    },
    
    /**
     * Reset the canvas to initial state
     */
    reset() {
      if (confirm('Are you sure you want to reset the canvas? All changes will be lost.')) {
        this.canvas.reset();
        this.image.reset();
        this.text.reset();
        this.history.reset();
        this.state.selectedElement = null;
        this.state.elementType = null;
        this.image.updateControls();
        this.text.updateControls();
        this.canvas.showDropZone();
        this.toast.show('Canvas reset successfully', 'success');
      }
    },
    
    /**
     * Export the current canvas as an image
     */
    exportImage() {
      this.canvas.exportAsPNG();
    },
    
    /**
     * Load initial application state
     */
    loadInitialState() {
      // Check for saved theme preference
      const darkModePreference = localStorage.getItem('darkMode');
      if (darkModePreference === 'false') {
        this.theme.setLightMode();
      }
    }
  };
  
  // Initialize the application
  app.init();
  
  // Make app accessible globally for debugging (in development only)
  window.imageEditorApp = app;
} 