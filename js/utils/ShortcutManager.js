/**
 * ShortcutManager - Handles keyboard shortcuts throughout the application
 */
export class ShortcutManager {
  constructor() {
    // Application reference
    this.app = null;
    
    // Shortcut definitions
    this.shortcuts = [
      {
        id: 'copy',
        keys: ['Control+c', 'Meta+c'],
        description: 'Copy selected element',
        handler: this.handleCopy.bind(this)
      },
      {
        id: 'paste',
        keys: ['Control+v', 'Meta+v'],
        description: 'Paste clipboard content',
        handler: this.handlePaste.bind(this)
      },
      {
        id: 'cut',
        keys: ['Control+x', 'Meta+x'],
        description: 'Cut selected element',
        handler: this.handleCut.bind(this)
      },
      {
        id: 'undo',
        keys: ['Control+z', 'Meta+z'],
        description: 'Undo last action',
        handler: this.handleUndo.bind(this)
      },
      {
        id: 'redo',
        keys: ['Control+Shift+z', 'Meta+Shift+z', 'Control+y', 'Meta+y'],
        description: 'Redo last undone action',
        handler: this.handleRedo.bind(this)
      },
      {
        id: 'delete',
        keys: ['Delete', 'Backspace'],
        description: 'Delete selected element',
        handler: this.handleDelete.bind(this)
      },
      {
        id: 'crop',
        keys: ['c'],
        description: 'Crop selected image',
        handler: this.handleCrop.bind(this)
      },
      {
        id: 'escape',
        keys: ['Escape'],
        description: 'Deselect current element',
        handler: this.handleEscape.bind(this)
      },
      {
        id: 'selectAll',
        keys: ['Control+a', 'Meta+a'],
        description: 'Select all elements',
        handler: this.handleSelectAll.bind(this)
      },
      {
        id: 'darkMode',
        keys: ['Control+i', 'Meta+i'],
        description: 'Toggle dark mode',
        handler: this.handleDarkModeToggle.bind(this)
      },
      {
        id: 'commandPalette',
        keys: ['Control+k', 'Meta+k'],
        description: 'Open command palette',
        handler: this.handleCommandPalette.bind(this)
      },
      {
        id: 'save',
        keys: ['Control+s', 'Meta+s'],
        description: 'Export image',
        handler: this.handleSave.bind(this)
      },
      {
        id: 'copyToClipboard',
        keys: ['Control+Shift+c', 'Meta+Shift+c'],
        description: 'Copy image to clipboard',
        handler: this.handleCopyImageToClipboard.bind(this)
      }
    ];
  }
  
  /**
   * Initialize the ShortcutManager
   * @param {Object} app - The main application object
   */
  init(app) {
    this.app = app;
    this.initKeyboardEvents();
  }
  
  /**
   * Set up keyboard event listeners
   */
  initKeyboardEvents() {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }
  
  /**
   * Handle keyboard events and route them to the appropriate handlers
   * @param {KeyboardEvent} event - The keyboard event
   */
  handleKeyDown(event) {
    // Don't handle shortcuts if user is typing in a text field
    if (this.isEditingText(event.target)) {
      return;
    }
    
    // Build the key combination string (e.g., 'Control+c')
    const keyCombo = this.buildKeyCombo(event);
    
    // Find matching shortcut
    const shortcut = this.shortcuts.find(shortcut => 
      shortcut.keys.some(key => key.toLowerCase() === keyCombo.toLowerCase())
    );
    
    if (shortcut) {
      event.preventDefault();
      shortcut.handler(event);
      
      // Log the shortcut usage (for development purposes)
      console.log(`Shortcut used: ${shortcut.id} (${keyCombo})`);
    }
  }
  
  /**
   * Build a string representation of the key combination
   * @param {KeyboardEvent} event - The keyboard event
   * @returns {string} The key combination as a string
   */
  buildKeyCombo(event) {
    let combo = [];
    
    if (event.ctrlKey) combo.push('Control');
    if (event.metaKey) combo.push('Meta');
    if (event.altKey) combo.push('Alt');
    if (event.shiftKey) combo.push('Shift');
    
    // Add the main key
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    combo.push(key);
    
    return combo.join('+');
  }
  
  /**
   * Check if user is currently editing text
   * @param {Element} target - The event target
   * @returns {boolean} True if user is editing text
   */
  isEditingText(target) {
    const editableElements = ['INPUT', 'TEXTAREA', 'SELECT'];
    return editableElements.includes(target.tagName) || 
           target.contentEditable === 'true';
  }
  
  /**
   * Get all available shortcuts
   * @returns {Array} Array of shortcut definitions
   */
  getShortcuts() {
    return this.shortcuts;
  }
  
  /**
   * Handle copy shortcut
   */
  handleCopy() {
    if (this.app.state.selectedElement && this.app.state.elementType) {
      this.app.clipboard.copyElement(
        this.app.state.selectedElement,
        this.app.state.elementType
      );
      this.app.toast.show('Element copied to clipboard', 'info');
    }
  }
  
  /**
   * Handle paste shortcut
   */
  handlePaste() {
    const success = this.app.clipboard.pasteElement();
    if (success) {
      this.app.toast.show('Element pasted from clipboard', 'success');
    }
  }
  
  /**
   * Handle cut shortcut
   */
  handleCut() {
    if (this.app.state.selectedElement && this.app.state.elementType) {
      this.app.clipboard.copyElement(
        this.app.state.selectedElement,
        this.app.state.elementType
      );
      
      if (this.app.state.elementType === 'image') {
        this.app.image.deleteSelectedImage();
      } else if (this.app.state.elementType === 'text') {
        this.app.text.deleteSelectedText();
      }
      
      this.app.toast.show('Element cut to clipboard', 'info');
    }
  }
  
  /**
   * Handle undo shortcut
   */
  handleUndo() {
    this.app.history.undo();
  }
  
  /**
   * Handle redo shortcut
   */
  handleRedo() {
    this.app.history.redo();
  }
  
  /**
   * Handle delete shortcut
   */
  handleDelete() {
    if (this.app.state.elementType === 'image') {
      this.app.image.deleteSelectedImage();
    } else if (this.app.state.elementType === 'text') {
      this.app.text.deleteSelectedText();
    }
  }
  
  /**
   * Handle crop shortcut
   */
  handleCrop() {
    if (this.app.state.elementType === 'image' && this.app.state.selectedElement) {
      this.app.image.startCrop();
    } else {
      this.app.toast.show('Please select an image first', 'warning');
    }
  }
  
  /**
   * Handle escape shortcut
   */
  handleEscape() {
    // Deselect element
    if (this.app.state.selectedElement) {
      this.app.state.selectedElement = null;
      this.app.state.elementType = null;
      this.app.canvas.render();
      this.app.image.updateControls();
      this.app.text.updateControls();
    }
    // Close command palette if open
    else if (this.app.command.isOpen()) {
      this.app.command.close();
    }
  }
  
  /**
   * Handle select all shortcut
   */
  handleSelectAll() {
    // Not implemented yet - would need to handle selecting multiple elements
    this.app.toast.show('Multiple selection not supported yet', 'info');
  }
  
  /**
   * Handle dark mode toggle
   */
  handleDarkModeToggle() {
    this.app.theme.toggle();
  }
  
  /**
   * Handle command palette shortcut
   */
  handleCommandPalette() {
    this.app.command.toggle();
  }
  
  /**
   * Handle save shortcut
   */
  handleSave() {
    this.app.exportImage();
  }
  
  /**
   * Handle copy image to clipboard
   */
  handleCopyImageToClipboard() {
    this.app.clipboard.copyCanvasToClipboard();
  }
} 