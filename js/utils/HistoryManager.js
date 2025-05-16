/**
 * HistoryManager - Handles undo/redo operations
 */
export class HistoryManager {
  constructor() {
    this.app = null;
    this.states = [];
    this.currentIndex = -1;
    this.maxStates = 30; // Maximum number of states to store
  }
  
  /**
   * Initialize the HistoryManager
   * @param {Object} app - The main application object
   */
  init(app) {
    this.app = app;
    this.initializeState();
  }
  
  /**
   * Initialize with first empty state
   */
  initializeState() {
    this.saveState();
  }
  
  /**
   * Save the current application state
   */
  saveState() {
    // Get current images and texts from app
    const state = {
      images: JSON.parse(JSON.stringify(this.app.image.getImages())),
      texts: JSON.parse(JSON.stringify(this.app.text.getTexts())),
      timestamp: Date.now()
    };
    
    // If we're not at the end of history, remove forward states
    if (this.currentIndex < this.states.length - 1) {
      this.states = this.states.slice(0, this.currentIndex + 1);
    }
    
    // Add new state
    this.states.push(state);
    this.currentIndex = this.states.length - 1;
    
    // Limit the number of states
    if (this.states.length > this.maxStates) {
      this.states.shift();
      this.currentIndex--;
    }
    
    // Update UI buttons
    this.updateButtonState();
  }
  
  /**
   * Undo the last action
   */
  undo() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.restoreState(this.states[this.currentIndex]);
      this.app.toast.show('Undo successful', 'info');
    } else {
      this.app.toast.show('Nothing to undo', 'info');
    }
    
    this.updateButtonState();
  }
  
  /**
   * Redo the last undone action
   */
  redo() {
    if (this.currentIndex < this.states.length - 1) {
      this.currentIndex++;
      this.restoreState(this.states[this.currentIndex]);
      this.app.toast.show('Redo successful', 'info');
    } else {
      this.app.toast.show('Nothing to redo', 'info');
    }
    
    this.updateButtonState();
  }
  
  /**
   * Restore application to a specific state
   * @param {Object} state - The state to restore
   */
  restoreState(state) {
    if (!state) return;
    
    // Update app state
    this.app.image.setImages(JSON.parse(JSON.stringify(state.images)));
    this.app.text.setTexts(JSON.parse(JSON.stringify(state.texts)));
    
    // Clear selection
    this.app.state.selectedElement = null;
    this.app.state.elementType = null;
    
    // Update UI
    this.app.canvas.render();
    this.app.image.updateControls();
    this.app.text.updateControls();
  }
  
  /**
   * Update the undo/redo button states
   */
  updateButtonState() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    
    if (undoBtn) {
      undoBtn.disabled = this.currentIndex <= 0;
    }
    
    if (redoBtn) {
      redoBtn.disabled = this.currentIndex >= this.states.length - 1;
    }
  }
  
  /**
   * Reset the history
   */
  reset() {
    this.states = [];
    this.currentIndex = -1;
    this.initializeState();
  }
  
  /**
   * Get the current state
   * @returns {Object} The current state
   */
  getCurrentState() {
    return this.states[this.currentIndex];
  }
  
  /**
   * Check if we can undo
   * @returns {boolean} True if undo is possible
   */
  canUndo() {
    return this.currentIndex > 0;
  }
  
  /**
   * Check if we can redo
   * @returns {boolean} True if redo is possible
   */
  canRedo() {
    return this.currentIndex < this.states.length - 1;
  }
} 