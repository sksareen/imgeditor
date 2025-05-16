/**
 * CanvasManager - Manages the canvas element and its rendering
 */
export class CanvasManager {
  constructor(canvasId) {
    this.canvasId = canvasId;
    this.canvasElement = null;
    this.app = null;
    this.dropZone = null;
    this.canvasDimensions = { width: 600, height: 600 };
    this.dragStartPosition = { x: 0, y: 0 };
    this.currentAspectRatio = { width: 1, height: 1 }; // Default 1:1
  }
  
  /**
   * Initialize the CanvasManager
   * @param {Object} app - The main application object
   */
  init(app) {
    this.app = app;
    this.canvasElement = document.getElementById(this.canvasId);
    this.dropZone = this.canvasElement.querySelector('.drop-zone');
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Set initial canvas dimensions
    this.updateCanvasSize();
  }
  
  /**
   * Set up canvas-related event listeners
   */
  setupEventListeners() {
    // Handle drag and drop events
    this.canvasElement.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.canvasElement.style.borderColor = 'var(--color-primary)';
      if (this.dropZone) {
        this.dropZone.classList.add('drag-over');
        if (this.dropZone.querySelector('#drop-message')) {
          this.dropZone.querySelector('#drop-message').textContent = 'Release to add image';
        }
      }
    });
    
    this.canvasElement.addEventListener('dragleave', () => {
      this.canvasElement.style.borderColor = 'var(--canvas-border-color)';
      if (this.dropZone) {
        this.dropZone.classList.remove('drag-over');
        if (this.dropZone.querySelector('#drop-message')) {
          this.dropZone.querySelector('#drop-message').textContent = 'Drop image here, upload, or choose a template';
        }
      }
    });
    
    this.canvasElement.addEventListener('drop', (e) => {
      e.preventDefault();
      this.canvasElement.style.borderColor = 'var(--canvas-border-color)';
      
      if (this.dropZone) {
        this.dropZone.classList.remove('drag-over');
      }
      
      if (e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith('image/')) {
          this.app.image.processImageFile(file);
        }
      }
    });
    
    // Handle mouse events for selection and dragging
    this.canvasElement.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    document.addEventListener('mouseup', () => this.handleMouseUp());
    
    // Handle touch events for mobile devices
    this.canvasElement.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    document.addEventListener('touchend', () => this.handleTouchEnd());
    
    // Handle window resize
    window.addEventListener('resize', () => this.updateCanvasSize());
  }
  
  /**
   * Handle touch start events for mobile
   * @param {TouchEvent} event - The touch event
   */
  handleTouchStart(event) {
    // Convert touch event to mouse-like coordinates
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      this.handleMouseDown({
        clientX: touch.clientX,
        clientY: touch.clientY,
        target: document.elementFromPoint(touch.clientX, touch.clientY),
        preventDefault: () => event.preventDefault(),
        stopPropagation: () => event.stopPropagation()
      });
    }
  }
  
  /**
   * Handle touch move events for mobile
   * @param {TouchEvent} event - The touch event
   */
  handleTouchMove(event) {
    if (event.touches.length === 1 && this.app.state.isDragging) {
      event.preventDefault(); // Prevent page scrolling while dragging
      
      const touch = event.touches[0];
      this.handleMouseMove({
        clientX: touch.clientX,
        clientY: touch.clientY
      });
    }
  }
  
  /**
   * Handle touch end events for mobile
   */
  handleTouchEnd() {
    this.handleMouseUp();
  }
  
  /**
   * Handle mouse down events on the canvas
   * @param {MouseEvent} event - The mouse event
   */
  handleMouseDown(event) {
    // Implement selection logic (will be expanded in the future)
    console.log('Canvas mousedown:', event.clientX, event.clientY);
  }
  
  /**
   * Handle mouse move events for dragging
   * @param {MouseEvent} event - The mouse event
   */
  handleMouseMove(event) {
    // Implement dragging logic (will be expanded in the future)
    if (this.app.state.isDragging) {
      console.log('Canvas mousemove (dragging):', event.clientX, event.clientY);
    }
  }
  
  /**
   * Handle mouse up events to end dragging
   */
  handleMouseUp() {
    // End dragging operations (will be expanded in the future)
    if (this.app.state.isDragging) {
      console.log('Canvas mouseup (end dragging)');
      this.app.state.isDragging = false;
    }
  }
  
  /**
   * Set canvas aspect ratio
   * @param {string} ratio - The aspect ratio in format "width:height"
   */
  setAspectRatio(ratio) {
    this.state.aspectRatio = ratio;
    const [width, height] = ratio.split(':').map(Number);
    this.currentAspectRatio = { width, height };
    
    // Find all aspect ratio toggles and update active state
    const aspectToggles = document.querySelectorAll('.aspect-toggle');
    aspectToggles.forEach(toggle => {
      if (toggle.dataset.ratio === ratio) {
        toggle.classList.add('active');
      } else {
        toggle.classList.remove('active');
      }
    });
    
    // Update canvas size with animation
    this.canvasElement.style.transition = 'height 0.3s ease';
    this.updateCanvasSize();
    
    // Remove transition after animation completes
    setTimeout(() => {
      this.canvasElement.style.transition = '';
    }, 300);
    
    // Update dimensions display
    this.updateDimensionsDisplay();
    
    // Re-render all elements to adjust to new size
    this.app.image.renderAllImages();
    this.app.text.renderAllTexts();
    
    // Notify user
    this.app.toast.show(`Canvas set to ${ratio} aspect ratio`, 'info');
  }
  
  /**
   * Update the canvas size based on the current aspect ratio
   */
  updateCanvasSize() {
    const containerWidth = this.canvasElement.parentElement.clientWidth;
    let canvasWidth = containerWidth;
    let canvasHeight = canvasWidth * (this.currentAspectRatio.height / this.currentAspectRatio.width);
    
    // Limit height for very tall aspect ratios
    const maxHeight = window.innerHeight * 0.7; // 70% of window height
    if (canvasHeight > maxHeight) {
      canvasHeight = maxHeight;
      canvasWidth = canvasHeight * (this.currentAspectRatio.width / this.currentAspectRatio.height);
    }
    
    // Update canvas size
    this.canvasDimensions = {
      width: Math.round(canvasWidth),
      height: Math.round(canvasHeight)
    };
    
    // Update dimensions display
    this.updateDimensionsDisplay();
  }
  
  /**
   * Update the dimensions display
   */
  updateDimensionsDisplay() {
    const dimensionsDisplay = document.getElementById('canvas-dimensions');
    if (dimensionsDisplay) {
      dimensionsDisplay.textContent = `${this.canvasDimensions.width} × ${this.canvasDimensions.height}`;
    }
  }
  
  /**
   * Export the canvas as a PNG image
   */
  exportAsPNG() {
    // Show loading indicator
    this.showLoading('Generating image...');
    
    // Use html2canvas to capture the canvas including all elements
    html2canvas(this.canvasElement, {
      backgroundColor: null,
      scale: 2, // Higher scale for better quality
      logging: false,
      allowTaint: true,
      useCORS: true
    }).then(canvas => {
      // Create a temporary link to download the image
      const link = document.createElement('a');
      link.download = 'image-editor-export.png';
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Hide loading indicator
      this.hideLoading();
      
      // Show success message
      this.app.toast.show('Image exported successfully', 'success');
    }).catch(err => {
      console.error('Error exporting image:', err);
      this.hideLoading();
      this.app.toast.show('Failed to export image', 'error');
    });
  }
  
  /**
   * Show the drop zone
   */
  showDropZone() {
    if (this.dropZone) {
      this.dropZone.style.display = 'flex';
    }
  }
  
  /**
   * Hide the drop zone
   */
  hideDropZone() {
    if (this.dropZone) {
      this.dropZone.style.display = 'none';
    }
  }
  
  /**
   * Render the canvas with all elements
   */
  render() {
    // This will be implemented to refresh the canvas state
    console.log('Canvas render called');
  }
  
  /**
   * Reset the canvas to initial state
   */
  reset() {
    this.showDropZone();
  }
  
  /**
   * Show a loading indicator
   * @param {string} message - The loading message to display
   */
  showLoading(message = 'Loading...') {
    let loadingEl = document.querySelector('.loading');
    
    if (!loadingEl) {
      loadingEl = document.createElement('div');
      loadingEl.className = 'loading';
      
      const content = document.createElement('div');
      content.className = 'loading-content';
      
      const spinner = document.createElement('div');
      spinner.className = 'spinner';
      
      const messageEl = document.createElement('div');
      
      content.appendChild(spinner);
      content.appendChild(messageEl);
      loadingEl.appendChild(content);
      document.body.appendChild(loadingEl);
    }
    
    const messageEl = loadingEl.querySelector('.loading-content div:not(.spinner)');
    if (messageEl) {
      messageEl.textContent = message;
    }
  }
  
  /**
   * Hide the loading indicator
   */
  hideLoading() {
    const loadingEl = document.querySelector('.loading');
    if (loadingEl) {
      document.body.removeChild(loadingEl);
    }
  }
  
  /**
   * Get the canvas dimensions
   * @returns {Object} The current canvas dimensions
   */
  getDimensions() {
    return this.canvasDimensions;
  }
} 