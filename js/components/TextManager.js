/**
 * TextManager - Manages text elements on the canvas
 */
export class TextManager {
  constructor() {
    this.app = null;
    this.texts = [];
  }
  
  /**
   * Initialize the TextManager
   * @param {Object} app - The main application object
   */
  init(app) {
    this.app = app;
    this.setupEventListeners();
  }
  
  /**
   * Set up text-related event listeners
   */
  setupEventListeners() {
    // Text control buttons
    const addTextBtn = document.getElementById('add-text-btn');
    if (addTextBtn) {
      addTextBtn.addEventListener('click', () => this.addNewText());
    }
    
    const deleteTextBtn = document.getElementById('delete-text-btn');
    if (deleteTextBtn) {
      deleteTextBtn.addEventListener('click', () => this.deleteSelectedText());
    }
    
    // Position buttons
    const positionTopBtn = document.getElementById('position-top');
    if (positionTopBtn) {
      positionTopBtn.addEventListener('click', () => this.positionText('top'));
    }
    
    const positionBottomBtn = document.getElementById('position-bottom');
    if (positionBottomBtn) {
      positionBottomBtn.addEventListener('click', () => this.positionText('bottom'));
    }
    
    // Text input and styling controls
    const textInput = document.getElementById('text-input');
    if (textInput) {
      textInput.addEventListener('input', () => this.updateSelectedText());
    }
    
    const textSize = document.getElementById('text-size');
    if (textSize) {
      textSize.addEventListener('input', () => this.updateTextSize());
    }
    
    const textColor = document.getElementById('text-color');
    if (textColor) {
      textColor.addEventListener('input', () => this.updateTextColor());
    }
  }
  
  /**
   * Add a new text element to the canvas
   * @param {string} [content="New Text"] - Initial text content
   */
  addNewText(content = 'New Text') {
    const canvas = document.getElementById('editor-canvas');
    const canvasWidth = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight;
    
    // Create new text object
    const newText = {
      id: `text-${Date.now()}`,
      content: content,
      x: canvasWidth / 2 - 100,
      y: canvasHeight / 2 - 20,
      fontSize: 36,
      color: '#ffffff',
      width: 200,
      height: 40
    };
    
    // Add to texts array
    this.texts.push(newText);
    
    // Hide the drop zone
    this.app.canvas.hideDropZone();
    
    // Render the text
    this.renderText(newText);
    
    // Select the new text
    this.selectText(this.texts.length - 1);
    
    // Save state for undo/redo
    this.app.history.saveState();
    
    // Notify user
    this.app.toast.show('Text added', 'success');
  }
  
  /**
   * Add text from data (for paste operations)
   * @param {Object} textData - The text data object
   */
  addTextFromData(textData) {
    // Add a new ID to prevent conflicts
    textData.id = `text-${Date.now()}`;
    
    // Add to texts array
    this.texts.push(textData);
    
    // Hide the drop zone
    this.app.canvas.hideDropZone();
    
    // Render the text
    this.renderText(textData);
    
    // Select the new text
    this.selectText(this.texts.length - 1);
    
    // Save state for undo/redo
    this.app.history.saveState();
  }
  
  /**
   * Render a text element on the canvas
   * @param {Object} text - The text object to render
   */
  renderText(text) {
    // Check if the text element already exists
    let textElement = document.getElementById(text.id);
    
    if (!textElement) {
      // Create a new text element
      textElement = document.createElement('div');
      textElement.id = text.id;
      textElement.className = 'meme-text';
      textElement.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        const index = this.texts.findIndex(t => t.id === text.id);
        if (index !== -1) {
          this.selectText(index);
          this.startDrag(e, textElement, this.texts[index]);
        }
      });
      
      // Add touch support for mobile
      textElement.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const index = this.texts.findIndex(t => t.id === text.id);
        if (index !== -1) {
          this.selectText(index);
          
          // Pass the touch event to the drag handler
          const touch = e.touches[0];
          this.startDrag({
            clientX: touch.clientX,
            clientY: touch.clientY,
            preventDefault: () => {},
            target: textElement
          }, textElement, this.texts[index]);
        }
      }, { passive: false });
      
      // Add to canvas
      document.getElementById('editor-canvas').appendChild(textElement);
    }
    
    // Update content and styling
    textElement.textContent = text.content;
    textElement.style.left = `${text.x}px`;
    textElement.style.top = `${text.y}px`;
    textElement.style.fontSize = `${text.fontSize}px`;
    textElement.style.color = text.color;
    textElement.style.width = `${text.width}px`;
    
    // Calculate height based on content
    textElement.style.height = 'auto'; // Reset height to auto to get natural height
    text.height = textElement.offsetHeight;
  }
  
  /**
   * Start dragging a text element
   * @param {MouseEvent|TouchEvent} event - The mouse or touch event
   * @param {HTMLElement} element - The text DOM element
   * @param {Object} text - The text data object
   */
  startDrag(event, element, text) {
    event.preventDefault();
    
    // Set dragging state
    this.app.state.isDragging = true;
    
    // Add dragging class for visual feedback
    element.classList.add('dragging');
    
    // Calculate offset from mouse position to element top-left
    const rect = element.getBoundingClientRect();
    const canvasRect = document.getElementById('editor-canvas').getBoundingClientRect();
    
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    
    // Create alignment guides
    this.createAlignmentGuides();
    
    // Set up the move handler
    const moveHandler = (moveEvent) => {
      let clientX, clientY;
      
      // Handle both mouse and touch events
      if (moveEvent.touches) {
        clientX = moveEvent.touches[0].clientX;
        clientY = moveEvent.touches[0].clientY;
      } else {
        clientX = moveEvent.clientX;
        clientY = moveEvent.clientY;
      }
      
      // Calculate new position
      let newLeft = clientX - canvasRect.left - offsetX;
      let newTop = clientY - canvasRect.top - offsetY;
      
      // Check for alignment with other texts (snapping)
      const snapThreshold = 10; // pixels
      let snappedH = false;
      let snappedV = false;
      
      // Hide all guides initially
      this.hideAlignmentGuides();
      
      // Get canvas dimensions
      const canvasWidth = this.app.canvas.canvasDimensions.width;
      const canvasHeight = this.app.canvas.canvasDimensions.height;
      
      // Snap to canvas edges
      if (newLeft < snapThreshold) {
        newLeft = 0;
        this.showAlignmentGuide('vertical', 0);
        snappedH = true;
      } else if (newLeft + text.width > canvasWidth - snapThreshold) {
        newLeft = canvasWidth - text.width;
        this.showAlignmentGuide('vertical', canvasWidth);
        snappedH = true;
      }
      
      if (newTop < snapThreshold) {
        newTop = 0;
        this.showAlignmentGuide('horizontal', 0);
        snappedV = true;
      } else if (newTop + text.height > canvasHeight - snapThreshold) {
        newTop = canvasHeight - text.height;
        this.showAlignmentGuide('horizontal', canvasHeight);
        snappedV = true;
      }
      
      // Check alignment with canvas center
      const canvasCenterX = canvasWidth / 2;
      const canvasCenterY = canvasHeight / 2;
      
      const thisCenterX = newLeft + text.width / 2;
      const thisCenterY = newTop + text.height / 2;
      
      if (Math.abs(thisCenterX - canvasCenterX) < snapThreshold && !snappedH) {
        newLeft = canvasCenterX - text.width / 2;
        this.showAlignmentGuide('vertical', canvasCenterX);
      }
      
      if (Math.abs(thisCenterY - canvasCenterY) < snapThreshold && !snappedV) {
        newTop = canvasCenterY - text.height / 2;
        this.showAlignmentGuide('horizontal', canvasCenterY);
      }
      
      // Constrain to canvas boundaries (with a small margin)
      newLeft = Math.max(0, Math.min(canvasWidth - text.width, newLeft));
      newTop = Math.max(0, Math.min(canvasHeight - text.height, newTop));
      
      // Apply the new position
      element.style.left = `${newLeft}px`;
      element.style.top = `${newTop}px`;
    };
    
    // Set up the end handler
    const endDrag = () => {
      this.app.state.isDragging = false;
      element.classList.remove('dragging');
      
      // Update the text data with new position
      const finalLeft = parseFloat(element.style.left);
      const finalTop = parseFloat(element.style.top);
      
      // Only update if position actually changed
      if (finalLeft !== text.x || finalTop !== text.y) {
        text.x = finalLeft;
        text.y = finalTop;
        
        // Update app state
        this.app.state.selectedElement = text;
        
        // Save state for undo/redo
        this.app.history.saveState();
      }
      
      // Remove guides
      this.removeAlignmentGuides();
      
      // Remove event listeners
      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('mouseup', endDrag);
      document.removeEventListener('touchmove', moveHandler);
      document.removeEventListener('touchend', endDrag);
    };
    
    // Attach events
    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchmove', moveHandler, { passive: false });
    document.addEventListener('touchend', endDrag);
  }
  
  /**
   * Create alignment guides for text dragging
   */
  createAlignmentGuides() {
    const canvas = document.getElementById('editor-canvas');
    
    // Create horizontal guide
    if (!this.horizontalGuide) {
      this.horizontalGuide = document.createElement('div');
      this.horizontalGuide.className = 'alignment-guide horizontal';
      this.horizontalGuide.style.display = 'none';
      canvas.appendChild(this.horizontalGuide);
    }
    
    // Create vertical guide
    if (!this.verticalGuide) {
      this.verticalGuide = document.createElement('div');
      this.verticalGuide.className = 'alignment-guide vertical';
      this.verticalGuide.style.display = 'none';
      canvas.appendChild(this.verticalGuide);
    }
  }
  
  /**
   * Show an alignment guide
   * @param {string} direction - 'horizontal' or 'vertical'
   * @param {number} position - Position in pixels
   */
  showAlignmentGuide(direction, position) {
    if (direction === 'horizontal' && this.horizontalGuide) {
      this.horizontalGuide.style.display = 'block';
      this.horizontalGuide.style.top = `${position}px`;
    } else if (direction === 'vertical' && this.verticalGuide) {
      this.verticalGuide.style.display = 'block';
      this.verticalGuide.style.left = `${position}px`;
    }
  }
  
  /**
   * Hide all alignment guides
   */
  hideAlignmentGuides() {
    if (this.horizontalGuide) {
      this.horizontalGuide.style.display = 'none';
    }
    if (this.verticalGuide) {
      this.verticalGuide.style.display = 'none';
    }
  }
  
  /**
   * Remove alignment guides from DOM
   */
  removeAlignmentGuides() {
    if (this.horizontalGuide && this.horizontalGuide.parentNode) {
      this.horizontalGuide.parentNode.removeChild(this.horizontalGuide);
      this.horizontalGuide = null;
    }
    if (this.verticalGuide && this.verticalGuide.parentNode) {
      this.verticalGuide.parentNode.removeChild(this.verticalGuide);
      this.verticalGuide = null;
    }
  }
  
  /**
   * Select a text element by index
   * @param {number} index - The index of the text to select
   */
  selectText(index) {
    // Clear any existing selection
    this.clearSelection();
    
    if (index >= 0 && index < this.texts.length) {
      // Set the selected text
      this.app.state.selectedElement = this.texts[index];
      this.app.state.elementType = 'text';
      
      // Add selected class to the text element
      const textElement = document.getElementById(this.texts[index].id);
      if (textElement) {
        textElement.classList.add('selected');
      }
      
      // Show text controls
      this.updateControls();
    }
  }
  
  /**
   * Clear the current selection
   */
  clearSelection() {
    // Remove selected class from all texts
    document.querySelectorAll('.meme-text').forEach(el => {
      el.classList.remove('selected');
    });
    
    // Hide text controls if we're deselecting a text
    if (this.app.state.elementType === 'text') {
      document.getElementById('text-controls').style.display = 'none';
    }
  }
  
  /**
   * Update the text controls based on selection
   */
  updateControls() {
    const textControls = document.getElementById('text-controls');
    const textInput = document.getElementById('text-input');
    const textSize = document.getElementById('text-size');
    const textSizeValue = document.getElementById('text-size-value');
    const textColor = document.getElementById('text-color');
    
    if (this.app.state.elementType === 'text' && this.app.state.selectedElement) {
      // Show text controls
      textControls.style.display = 'block';
      
      // Update control values
      textInput.value = this.app.state.selectedElement.content;
      textSize.value = this.app.state.selectedElement.fontSize;
      textSizeValue.textContent = `${this.app.state.selectedElement.fontSize}px`;
      textColor.value = this.app.state.selectedElement.color;
    } else {
      // Hide text controls
      textControls.style.display = 'none';
    }
  }
  
  /**
   * Update the selected text content
   */
  updateSelectedText() {
    if (this.app.state.elementType === 'text' && this.app.state.selectedElement) {
      const textInput = document.getElementById('text-input');
      const newText = textInput.value;
      
      // Find the text index
      const index = this.texts.findIndex(text => text.id === this.app.state.selectedElement.id);
      if (index !== -1) {
        // Update text content
        this.texts[index].content = newText;
        
        // Update the text element
        this.renderText(this.texts[index]);
        
        // Update app state
        this.app.state.selectedElement = this.texts[index];
        
        // Save state for undo/redo (debounced to avoid too many states)
        this.debounceHistorySave();
      }
    }
  }
  
  /**
   * Debounce history save to avoid too many states when typing
   */
  debounceHistorySave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    this.saveTimeout = setTimeout(() => {
      this.app.history.saveState();
      this.saveTimeout = null;
    }, 500);
  }
  
  /**
   * Update the selected text size
   */
  updateTextSize() {
    if (this.app.state.elementType === 'text' && this.app.state.selectedElement) {
      const textSize = document.getElementById('text-size');
      const textSizeValue = document.getElementById('text-size-value');
      const newSize = parseInt(textSize.value);
      
      // Update displayed value
      textSizeValue.textContent = `${newSize}px`;
      
      // Find the text index
      const index = this.texts.findIndex(text => text.id === this.app.state.selectedElement.id);
      if (index !== -1) {
        // Update text size
        this.texts[index].fontSize = newSize;
        
        // Update the text element
        this.renderText(this.texts[index]);
        
        // Update app state
        this.app.state.selectedElement = this.texts[index];
        
        // Save state for undo/redo
        this.debounceHistorySave();
      }
    }
  }
  
  /**
   * Update the selected text color
   */
  updateTextColor() {
    if (this.app.state.elementType === 'text' && this.app.state.selectedElement) {
      const textColor = document.getElementById('text-color');
      const newColor = textColor.value;
      
      // Find the text index
      const index = this.texts.findIndex(text => text.id === this.app.state.selectedElement.id);
      if (index !== -1) {
        // Update text color
        this.texts[index].color = newColor;
        
        // Update the text element
        this.renderText(this.texts[index]);
        
        // Update app state
        this.app.state.selectedElement = this.texts[index];
        
        // Save state for undo/redo
        this.app.history.saveState();
      }
    }
  }
  
  /**
   * Position the selected text at a predefined position
   * @param {string} position - The position ('top' or 'bottom')
   */
  positionText(position) {
    if (this.app.state.elementType === 'text' && this.app.state.selectedElement) {
      // Find the text index
      const index = this.texts.findIndex(text => text.id === this.app.state.selectedElement.id);
      if (index !== -1) {
        const canvas = document.getElementById('editor-canvas');
        const text = this.texts[index];
        
        // Calculate position
        if (position === 'top') {
          text.y = 20;
          text.x = (canvas.clientWidth - text.width) / 2;
        } else if (position === 'bottom') {
          text.y = canvas.clientHeight - text.height - 20;
          text.x = (canvas.clientWidth - text.width) / 2;
        }
        
        // Update the text element
        this.renderText(text);
        
        // Update app state
        this.app.state.selectedElement = text;
        
        // Save state for undo/redo
        this.app.history.saveState();
      }
    }
  }
  
  /**
   * Delete the selected text
   */
  deleteSelectedText() {
    if (this.app.state.elementType === 'text' && this.app.state.selectedElement) {
      // Find the text index
      const index = this.texts.findIndex(text => text.id === this.app.state.selectedElement.id);
      if (index !== -1) {
        // Remove the text element from DOM
        const textElement = document.getElementById(this.texts[index].id);
        if (textElement) {
          textElement.parentElement.removeChild(textElement);
        }
        
        // Remove from array
        this.texts.splice(index, 1);
        
        // Clear selection
        this.app.state.selectedElement = null;
        this.app.state.elementType = null;
        
        // Hide controls
        document.getElementById('text-controls').style.display = 'none';
        
        // Show drop zone if no elements left
        if (this.texts.length === 0 && this.app.image.getImages().length === 0) {
          this.app.canvas.showDropZone();
        }
        
        // Save state for undo/redo
        this.app.history.saveState();
        
        // Notify user
        this.app.toast.show('Text deleted', 'info');
      }
    }
  }
  
  /**
   * Render all text elements
   */
  renderAllTexts() {
    // Remove all text elements
    document.querySelectorAll('.meme-text').forEach(el => {
      el.remove();
    });
    
    // Render all texts
    this.texts.forEach(text => {
      this.renderText(text);
    });
  }
  
  /**
   * Get all texts
   * @returns {Array} The array of texts
   */
  getTexts() {
    return this.texts;
  }
  
  /**
   * Set texts from history state
   * @param {Array} texts - The array of texts to set
   */
  setTexts(texts) {
    this.texts = texts;
    this.renderAllTexts();
  }
  
  /**
   * Reset all texts
   */
  reset() {
    // Remove all text elements
    document.querySelectorAll('.meme-text').forEach(el => {
      el.remove();
    });
    
    // Clear texts array
    this.texts = [];
  }
} 