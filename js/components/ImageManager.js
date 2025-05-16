/**
 * ImageManager - Manages images on the canvas
 */
export class ImageManager {
  constructor() {
    this.app = null;
    this.images = [];
  }
  
  /**
   * Initialize the ImageManager
   * @param {Object} app - The main application object
   */
  init(app) {
    this.app = app;
    this.setupEventListeners();
    this.loadTemplates();
  }
  
  /**
   * Set up image-related event listeners
   */
  setupEventListeners() {
    // File upload button
    const uploadInput = document.getElementById('upload-image');
    if (uploadInput) {
      uploadInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          const file = e.target.files[0];
          if (file.type.startsWith('image/')) {
            this.processImageFile(file);
          }
        }
      });
    }
    
    // Image control buttons
    const deleteImageBtn = document.getElementById('delete-image-btn');
    if (deleteImageBtn) {
      deleteImageBtn.addEventListener('click', () => this.deleteSelectedImage());
    }
    
    const bringFrontBtn = document.getElementById('bring-front-btn');
    if (bringFrontBtn) {
      bringFrontBtn.addEventListener('click', () => this.bringSelectedImageToFront());
    }
    
    const sendBackBtn = document.getElementById('send-back-btn');
    if (sendBackBtn) {
      sendBackBtn.addEventListener('click', () => this.sendSelectedImageToBack());
    }
    
    // Transform controls
    const imageScale = document.getElementById('image-scale');
    if (imageScale) {
      imageScale.addEventListener('input', () => this.updateImageTransform());
    }
    
    const imageRotation = document.getElementById('image-rotation');
    if (imageRotation) {
      imageRotation.addEventListener('input', () => this.updateImageTransform());
    }
    
    const keepAspectRatio = document.getElementById('keep-aspect-ratio');
    if (keepAspectRatio) {
      keepAspectRatio.addEventListener('change', () => this.updateImageTransform());
    }
    
    const resetTransformBtn = document.getElementById('reset-transform-btn');
    if (resetTransformBtn) {
      resetTransformBtn.addEventListener('click', () => this.resetImageTransform());
    }
    
    // Crop buttons
    const cropBtn = document.getElementById('crop-btn');
    if (cropBtn) {
      cropBtn.addEventListener('click', () => this.startCrop());
    }
    
    const applyCropBtn = document.getElementById('apply-crop-btn');
    if (applyCropBtn) {
      applyCropBtn.addEventListener('click', () => this.applyCrop());
    }
    
    const cancelCropBtn = document.getElementById('cancel-crop-btn');
    if (cancelCropBtn) {
      cancelCropBtn.addEventListener('click', () => this.cancelCrop());
    }
  }
  
  /**
   * Initialize crop mode for the selected image
   */
  startCrop() {
    if (this.app.state.elementType !== 'image' || !this.app.state.selectedElement) {
      this.app.toast.show('Please select an image first', 'warning');
      return;
    }
    
    // Set crop mode
    this.app.state.isCropping = true;
    
    // Get selected image
    const imageIndex = this.images.findIndex(img => img.id === this.app.state.selectedElement.id);
    if (imageIndex === -1) return;
    
    const image = this.images[imageIndex];
    const imageElement = document.getElementById(image.id);
    
    // Store original image data for cancellation
    this.cropOriginalData = { ...image };
    
    // Create crop overlay
    this.createCropOverlay(imageElement, image);
    
    // Show crop controls
    const cropControls = document.getElementById('crop-controls');
    if (cropControls) {
      cropControls.style.display = 'block';
    }
    
    // Disable other controls while cropping
    const imageScale = document.getElementById('image-scale');
    if (imageScale) imageScale.disabled = true;
    
    this.app.toast.show('Drag the handles to adjust crop area', 'info');
  }
  
  /**
   * Create crop overlay and handles
   * @param {HTMLElement} imageElement - The image DOM element
   * @param {Object} image - The image data object
   */
  createCropOverlay(imageElement, image) {
    // Get image position and dimensions
    const rect = imageElement.getBoundingClientRect();
    const canvas = document.getElementById('editor-canvas');
    const canvasRect = canvas.getBoundingClientRect();
    
    // Calculate relative position to canvas
    const cropAreaWidth = image.width * 0.8;
    const cropAreaHeight = image.height * 0.8;
    
    // Create crop area element
    const cropArea = document.createElement('div');
    cropArea.className = 'crop-area';
    cropArea.style.width = `${cropAreaWidth}px`;
    cropArea.style.height = `${cropAreaHeight}px`;
    cropArea.style.left = `${image.x + (image.width - cropAreaWidth) / 2}px`;
    cropArea.style.top = `${image.y + (image.height - cropAreaHeight) / 2}px`;
    
    // Create inner area for drag events
    const cropAreaInner = document.createElement('div');
    cropAreaInner.className = 'crop-area-inner';
    cropArea.appendChild(cropAreaInner);
    
    // Create crop overlay (the dark area around the crop)
    const cropOverlay = document.createElement('div');
    cropOverlay.className = 'crop-overlay';
    cropOverlay.style.width = `${image.width}px`;
    cropOverlay.style.height = `${image.height}px`;
    cropOverlay.style.left = `${image.x}px`;
    cropOverlay.style.top = `${image.y}px`;
    
    // Create grid inside crop area (rule of thirds)
    const cropGrid = document.createElement('div');
    cropGrid.className = 'crop-grid';
    
    // Add grid lines
    for (let i = 0; i < 4; i++) {
      const gridLine = document.createElement('div');
      gridLine.className = 'crop-grid-line';
      cropGrid.appendChild(gridLine);
    }
    
    cropArea.appendChild(cropGrid);
    
    // Add resize handles
    const positions = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    positions.forEach(pos => {
      const handle = document.createElement('div');
      handle.className = `crop-handle ${pos}`;
      handle.dataset.position = pos;
      cropArea.appendChild(handle);
      
      // Add mousedown event for resizing
      handle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        this.startCropResize(e, pos);
      });
      
      // Add touch events for mobile
      handle.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        const touch = e.touches[0];
        this.startCropResize({
          clientX: touch.clientX,
          clientY: touch.clientY,
          preventDefault: () => e.preventDefault()
        }, pos);
      }, { passive: false });
    });
    
    // Add event listeners for dragging the crop area
    cropAreaInner.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      this.startCropDrag(e);
    });
    
    cropAreaInner.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      const touch = e.touches[0];
      this.startCropDrag({
        clientX: touch.clientX,
        clientY: touch.clientY,
        preventDefault: () => e.preventDefault()
      });
    }, { passive: false });
    
    // Add to canvas
    canvas.appendChild(cropOverlay);
    canvas.appendChild(cropArea);
    
    // Store references
    this.cropArea = cropArea;
    this.cropOverlay = cropOverlay;
  }
  
  /**
   * Start crop area drag operation
   * @param {MouseEvent|TouchEvent} event - The mouse or touch event
   */
  startCropDrag(event) {
    event.preventDefault();
    
    const canvas = document.getElementById('editor-canvas');
    const canvasRect = canvas.getBoundingClientRect();
    
    // Get crop area position
    const cropAreaRect = this.cropArea.getBoundingClientRect();
    
    // Calculate offset
    const offsetX = event.clientX - cropAreaRect.left;
    const offsetY = event.clientY - cropAreaRect.top;
    
    // Get image boundaries
    const imageIndex = this.images.findIndex(img => img.id === this.app.state.selectedElement.id);
    if (imageIndex === -1) return;
    
    const image = this.images[imageIndex];
    
    const moveHandler = (moveEvent) => {
      let clientX, clientY;
      
      if (moveEvent.touches) {
        clientX = moveEvent.touches[0].clientX;
        clientY = moveEvent.touches[0].clientY;
      } else {
        clientX = moveEvent.clientX;
        clientY = moveEvent.clientY;
      }
      
      // Calculate new position relative to canvas
      let newLeft = clientX - canvasRect.left - offsetX;
      let newTop = clientY - canvasRect.top - offsetY;
      
      // Constrain to image bounds
      const cropWidth = parseFloat(this.cropArea.style.width);
      const cropHeight = parseFloat(this.cropArea.style.height);
      
      newLeft = Math.max(image.x, Math.min(image.x + image.width - cropWidth, newLeft));
      newTop = Math.max(image.y, Math.min(image.y + image.height - cropHeight, newTop));
      
      // Update crop area position
      this.cropArea.style.left = `${newLeft}px`;
      this.cropArea.style.top = `${newTop}px`;
    };
    
    const endHandler = () => {
      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('mouseup', endHandler);
      document.removeEventListener('touchmove', moveHandler);
      document.removeEventListener('touchend', endHandler);
    };
    
    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', endHandler);
    document.addEventListener('touchmove', moveHandler, { passive: false });
    document.addEventListener('touchend', endHandler);
  }
  
  /**
   * Start crop area resize operation
   * @param {MouseEvent|TouchEvent} event - The mouse or touch event
   * @param {string} position - The handle position (nw, n, ne, etc.)
   */
  startCropResize(event, position) {
    event.preventDefault();
    
    const canvas = document.getElementById('editor-canvas');
    const canvasRect = canvas.getBoundingClientRect();
    
    // Get current crop area dimensions and position
    const cropAreaRect = this.cropArea.getBoundingClientRect();
    const startLeft = parseFloat(this.cropArea.style.left);
    const startTop = parseFloat(this.cropArea.style.top);
    const startWidth = parseFloat(this.cropArea.style.width);
    const startHeight = parseFloat(this.cropArea.style.height);
    
    // Starting mouse position
    const startX = event.clientX;
    const startY = event.clientY;
    
    // Get image boundaries
    const imageIndex = this.images.findIndex(img => img.id === this.app.state.selectedElement.id);
    if (imageIndex === -1) return;
    
    const image = this.images[imageIndex];
    
    const moveHandler = (moveEvent) => {
      let clientX, clientY;
      
      if (moveEvent.touches) {
        clientX = moveEvent.touches[0].clientX;
        clientY = moveEvent.touches[0].clientY;
      } else {
        clientX = moveEvent.clientX;
        clientY = moveEvent.clientY;
      }
      
      // Calculate deltas
      const deltaX = clientX - startX;
      const deltaY = clientY - startY;
      
      // New dimensions and position
      let newLeft = startLeft;
      let newTop = startTop;
      let newWidth = startWidth;
      let newHeight = startHeight;
      
      // Update based on which handle is being dragged
      if (position.includes('n')) {
        newTop = Math.max(image.y, Math.min(startTop + startHeight - 20, startTop + deltaY));
        newHeight = startHeight - (newTop - startTop);
      }
      
      if (position.includes('s')) {
        newHeight = Math.max(20, Math.min(image.y + image.height - startTop, startHeight + deltaY));
      }
      
      if (position.includes('w')) {
        newLeft = Math.max(image.x, Math.min(startLeft + startWidth - 20, startLeft + deltaX));
        newWidth = startWidth - (newLeft - startLeft);
      }
      
      if (position.includes('e')) {
        newWidth = Math.max(20, Math.min(image.x + image.width - startLeft, startWidth + deltaX));
      }
      
      // Update crop area
      this.cropArea.style.left = `${newLeft}px`;
      this.cropArea.style.top = `${newTop}px`;
      this.cropArea.style.width = `${newWidth}px`;
      this.cropArea.style.height = `${newHeight}px`;
    };
    
    const endHandler = () => {
      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('mouseup', endHandler);
      document.removeEventListener('touchmove', moveHandler);
      document.removeEventListener('touchend', endHandler);
    };
    
    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', endHandler);
    document.addEventListener('touchmove', moveHandler, { passive: false });
    document.addEventListener('touchend', endHandler);
  }
  
  /**
   * Apply the crop to the selected image
   */
  applyCrop() {
    if (!this.app.state.isCropping || !this.cropArea || !this.cropOverlay) {
      return;
    }
    
    // Get image index
    const imageIndex = this.images.findIndex(img => img.id === this.app.state.selectedElement.id);
    if (imageIndex === -1) return;
    
    // Get crop area dimensions and position
    const cropLeft = parseFloat(this.cropArea.style.left);
    const cropTop = parseFloat(this.cropArea.style.top);
    const cropWidth = parseFloat(this.cropArea.style.width);
    const cropHeight = parseFloat(this.cropArea.style.height);
    
    // Get selected image
    const image = this.images[imageIndex];
    
    // Calculate crop in original image coordinates
    const originalWidth = image.width / image.scaleFactor;
    const originalHeight = image.height / image.scaleFactor;
    
    // Calculate relative crop position within the image
    const relativeLeft = (cropLeft - image.x) / image.width;
    const relativeTop = (cropTop - image.y) / image.height;
    const relativeWidth = cropWidth / image.width;
    const relativeHeight = cropHeight / image.height;
    
    // Create new image with crop
    const img = new Image();
    img.onload = () => {
      // Create a canvas to perform the crop
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set dimensions for the cropped section
      canvas.width = originalWidth * relativeWidth;
      canvas.height = originalHeight * relativeHeight;
      
      // Draw the cropped portion of the image
      ctx.drawImage(
        img,
        originalWidth * relativeLeft,
        originalHeight * relativeTop,
        originalWidth * relativeWidth,
        originalHeight * relativeHeight,
        0, 0, canvas.width, canvas.height
      );
      
      // Get the cropped image data
      const croppedImageData = canvas.toDataURL('image/png');
      
      // Create new image from cropped data
      const croppedImg = new Image();
      croppedImg.onload = () => {
        // Update the image
        image.src = croppedImageData;
        image.width = cropWidth;
        image.height = cropHeight;
        image.x = cropLeft;
        image.y = cropTop;
        image.scaleFactor = cropWidth / croppedImg.width;
        
        // Update the DOM element
        this.renderImage(image);
        
        // Clean up
        this.cleanupCropUI();
        
        // Update app state
        this.app.state.selectedElement = image;
        
        // Save state for undo/redo
        this.app.history.saveState();
        
        // Notify user
        this.app.toast.show('Image cropped successfully', 'success');
      };
      croppedImg.src = croppedImageData;
    };
    img.src = image.src;
  }
  
  /**
   * Cancel the crop operation
   */
  cancelCrop() {
    this.cleanupCropUI();
    this.app.toast.show('Crop cancelled', 'info');
  }
  
  /**
   * Clean up crop UI elements
   */
  cleanupCropUI() {
    // Remove crop elements
    if (this.cropArea && this.cropArea.parentNode) {
      this.cropArea.parentNode.removeChild(this.cropArea);
    }
    
    if (this.cropOverlay && this.cropOverlay.parentNode) {
      this.cropOverlay.parentNode.removeChild(this.cropOverlay);
    }
    
    // Hide crop controls
    const cropControls = document.getElementById('crop-controls');
    if (cropControls) {
      cropControls.style.display = 'none';
    }
    
    // Re-enable other controls
    const imageScale = document.getElementById('image-scale');
    if (imageScale) imageScale.disabled = false;
    
    // Reset crop state
    this.app.state.isCropping = false;
    this.cropArea = null;
    this.cropOverlay = null;
    this.cropOriginalData = null;
  }
  
  /**
   * Process an uploaded image file
   * @param {File} file - The image file to process
   */
  processImageFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.addImage(img);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
  
  /**
   * Add a new image to the canvas
   * @param {HTMLImageElement} img - The image element to add
   */
  addImage(img) {
    // Calculate appropriate size for the image
    const canvas = document.getElementById('editor-canvas');
    const canvasWidth = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight;
    
    let width = img.width;
    let height = img.height;
    
    // Scale down large images
    if (width > canvasWidth - 40 || height > canvasHeight - 40) {
      const scale = Math.min(
        (canvasWidth - 40) / width,
        (canvasHeight - 40) / height
      );
      width *= scale;
      height *= scale;
    }
    
    // Create the image object
    const newImage = {
      id: `image-${Date.now()}`,
      src: img.src,
      width,
      height,
      x: (canvasWidth - width) / 2,
      y: (canvasHeight - height) / 2,
      scaleFactor: width / img.width,
      rotation: 0,
      originalWidth: img.width,
      originalHeight: img.height
    };
    
    // Add to images array
    this.images.push(newImage);
    
    // Save state for undo/redo
    this.app.history.saveState();
    
    // Hide the drop zone
    this.app.canvas.hideDropZone();
    
    // Render the image
    this.renderImage(newImage);
    
    // Notify user
    this.app.toast.show('Image added successfully', 'success');
  }
  
  /**
   * Add an image from data (for paste operations)
   * @param {Object} imageData - The image data object
   */
  addImageFromData(imageData) {
    // Add a new ID to prevent conflicts
    imageData.id = `image-${Date.now()}`;
    
    // Add to images array
    this.images.push(imageData);
    
    // Save state for undo/redo
    this.app.history.saveState();
    
    // Hide the drop zone
    this.app.canvas.hideDropZone();
    
    // Render the image
    this.renderImage(imageData);
    
    // Select the new image
    this.selectImage(this.images.length - 1);
  }
  
  /**
   * Render an image on the canvas
   * @param {Object} image - The image object to render
   */
  renderImage(image) {
    // Check if the image element already exists
    let imgElement = document.getElementById(image.id);
    
    if (!imgElement) {
      // Create a new image element
      imgElement = document.createElement('img');
      imgElement.id = image.id;
      imgElement.className = 'image-item';
      imgElement.draggable = false; // Prevent default drag behavior
      imgElement.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        const index = this.images.findIndex(img => img.id === image.id);
        if (index !== -1) {
          this.selectImage(index);
          this.startDrag(e, imgElement, this.images[index]);
        }
      });
      
      // Add touch support for mobile
      imgElement.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const index = this.images.findIndex(img => img.id === image.id);
        if (index !== -1) {
          this.selectImage(index);
          
          // Pass the touch event to the drag handler
          const touch = e.touches[0];
          this.startDrag({
            clientX: touch.clientX,
            clientY: touch.clientY,
            preventDefault: () => {},
            target: imgElement
          }, imgElement, this.images[index]);
        }
      }, { passive: false });
      
      // Add to canvas
      document.getElementById('editor-canvas').appendChild(imgElement);
    }
    
    // Update position and size
    imgElement.src = image.src;
    imgElement.style.width = `${image.width}px`;
    imgElement.style.height = `${image.height}px`;
    imgElement.style.left = `${image.x}px`;
    imgElement.style.top = `${image.y}px`;
    
    // Apply rotation if set
    if (image.rotation) {
      imgElement.style.transform = `rotate(${image.rotation}deg)`;
    } else {
      imgElement.style.transform = '';
    }
    
    // Update or create transform handles
    this.updateTransformHandles(image);
  }
  
  /**
   * Create or update transform handles for an image
   * @param {Object} image - The image object
   */
  updateTransformHandles(image) {
    const canvas = document.getElementById('editor-canvas');
    const imgElement = document.getElementById(image.id);
    
    if (!imgElement) return;
    
    // Clear existing handles for this image
    this.removeTransformHandles(image.id);
    
    // Only add handles if this image is selected
    if (this.app.state.selectedElement && this.app.state.selectedElement.id === image.id) {
      // Create resize handles for corners
      const resizePositions = ['nw', 'ne', 'se', 'sw'];
      resizePositions.forEach(pos => {
        const handle = document.createElement('div');
        handle.className = `transform-handle resize ${pos}`;
        handle.id = `resize-${pos}-${image.id}`;
        handle.setAttribute('data-handle-type', 'resize');
        handle.setAttribute('data-position', pos);
        handle.setAttribute('data-target', image.id);
        
        // Add resize event listeners
        handle.addEventListener('mousedown', (e) => {
          e.stopPropagation();
          this.startResize(e, pos, image);
        });
        
        handle.addEventListener('touchstart', (e) => {
          e.stopPropagation();
          e.preventDefault();
          const touch = e.touches[0];
          this.startResize({
            clientX: touch.clientX,
            clientY: touch.clientY,
            preventDefault: () => {},
            target: handle
          }, pos, image);
        }, { passive: false });
        
        canvas.appendChild(handle);
      });
      
      // Create rotation handles for corners
      const rotatePositions = ['nw', 'ne', 'se', 'sw'];
      rotatePositions.forEach(pos => {
        const handle = document.createElement('div');
        handle.className = `transform-handle rotate ${pos}`;
        handle.id = `rotate-${pos}-${image.id}`;
        handle.setAttribute('data-handle-type', 'rotate');
        handle.setAttribute('data-position', pos);
        handle.setAttribute('data-target', image.id);
        
        // Add rotation event listeners
        handle.addEventListener('mousedown', (e) => {
          e.stopPropagation();
          this.startRotate(e, pos, image);
        });
        
        handle.addEventListener('touchstart', (e) => {
          e.stopPropagation();
          e.preventDefault();
          const touch = e.touches[0];
          this.startRotate({
            clientX: touch.clientX,
            clientY: touch.clientY,
            preventDefault: () => {},
            target: handle
          }, pos, image);
        }, { passive: false });
        
        canvas.appendChild(handle);
      });
      
      // Position handles
      this.positionTransformHandles(image);
    }
  }
  
  /**
   * Position transform handles around the image
   * @param {Object} image - The image object
   */
  positionTransformHandles(image) {
    const imgElement = document.getElementById(image.id);
    if (!imgElement) return;
    
    const rect = imgElement.getBoundingClientRect();
    const canvasRect = document.getElementById('editor-canvas').getBoundingClientRect();
    
    // Position resize handles
    const resizePositions = ['nw', 'ne', 'se', 'sw'];
    resizePositions.forEach(pos => {
      const handle = document.getElementById(`resize-${pos}-${image.id}`);
      if (handle) {
        // Position based on actual image position and size
        if (pos === 'nw') {
          handle.style.left = `${image.x}px`;
          handle.style.top = `${image.y}px`;
        } else if (pos === 'ne') {
          handle.style.left = `${image.x + image.width}px`;
          handle.style.top = `${image.y}px`;
        } else if (pos === 'se') {
          handle.style.left = `${image.x + image.width}px`;
          handle.style.top = `${image.y + image.height}px`;
        } else if (pos === 'sw') {
          handle.style.left = `${image.x}px`;
          handle.style.top = `${image.y + image.height}px`;
        }
        
        // Adjust for handle center
        handle.style.transform = 'translate(-50%, -50%)';
      }
    });
    
    // Position rotation handles
    const rotatePositions = ['nw', 'ne', 'se', 'sw'];
    rotatePositions.forEach(pos => {
      const handle = document.getElementById(`rotate-${pos}-${image.id}`);
      if (handle) {
        // Position based on actual image position and size
        if (pos === 'nw') {
          handle.style.left = `${image.x - 20}px`;
          handle.style.top = `${image.y - 20}px`;
        } else if (pos === 'ne') {
          handle.style.left = `${image.x + image.width + 20}px`;
          handle.style.top = `${image.y - 20}px`;
        } else if (pos === 'se') {
          handle.style.left = `${image.x + image.width + 20}px`;
          handle.style.top = `${image.y + image.height + 20}px`;
        } else if (pos === 'sw') {
          handle.style.left = `${image.x - 20}px`;
          handle.style.top = `${image.y + image.height + 20}px`;
        }
        
        // Adjust for handle center
        handle.style.transform = 'translate(-50%, -50%)';
      }
    });
  }
  
  /**
   * Remove all transform handles for an image
   * @param {string} imageId - The ID of the image
   */
  removeTransformHandles(imageId) {
    const canvas = document.getElementById('editor-canvas');
    
    // Remove all resize handles
    const resizeHandles = canvas.querySelectorAll(`.transform-handle[data-target="${imageId}"]`);
    resizeHandles.forEach(handle => {
      if (handle.parentNode) {
        handle.parentNode.removeChild(handle);
      }
    });
  }
  
  /**
   * Start resize operation on an image
   * @param {MouseEvent|TouchEvent} event - The mouse or touch event
   * @param {string} position - The handle position (nw, ne, se, sw)
   * @param {Object} image - The image data object
   */
  startResize(event, position, image) {
    event.preventDefault();
    
    // Set resizing state
    this.app.state.isResizing = true;
    
    // Get current image dimensions and position
    const startWidth = image.width;
    const startHeight = image.height;
    const startX = image.x;
    const startY = image.y;
    
    // Calculate aspect ratio
    const aspectRatio = startWidth / startHeight;
    
    // Calculate the center of the image (fixed point for transformation)
    const centerX = startX + startWidth / 2;
    const centerY = startY + startHeight / 2;
    
    // Starting mouse position
    const startMouseX = event.clientX;
    const startMouseY = event.clientY;
    
    // Get opposite corner coordinates (the corner that stays fixed during resize)
    let fixedCornerX, fixedCornerY;
    
    if (position === 'nw') {
      fixedCornerX = startX + startWidth;
      fixedCornerY = startY + startHeight;
    } else if (position === 'ne') {
      fixedCornerX = startX;
      fixedCornerY = startY + startHeight;
    } else if (position === 'se') {
      fixedCornerX = startX;
      fixedCornerY = startY;
    } else if (position === 'sw') {
      fixedCornerX = startX + startWidth;
      fixedCornerY = startY;
    }
    
    // Get canvas dimensions
    const canvas = document.getElementById('editor-canvas');
    const canvasRect = canvas.getBoundingClientRect();
    
    const moveHandler = (moveEvent) => {
      // Get current mouse position
      let clientX, clientY;
      
      if (moveEvent.touches) {
        clientX = moveEvent.touches[0].clientX;
        clientY = moveEvent.touches[0].clientY;
      } else {
        clientX = moveEvent.clientX;
        clientY = moveEvent.clientY;
      }
      
      // Calculate mouse movement delta
      const deltaX = clientX - startMouseX;
      const deltaY = clientY - startMouseY;
      
      // Calculate new dimensions and position based on which corner is being dragged
      let newWidth, newHeight, newX, newY;
      
      if (position === 'nw') {
        // Northwest corner (top-left)
        newWidth = startWidth - deltaX;
        newHeight = startHeight - deltaY;
        
        // Maintain aspect ratio
        if (newWidth / newHeight !== aspectRatio) {
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            newHeight = newWidth / aspectRatio;
          } else {
            newWidth = newHeight * aspectRatio;
          }
        }
        
        newX = fixedCornerX - newWidth;
        newY = fixedCornerY - newHeight;
      } else if (position === 'ne') {
        // Northeast corner (top-right)
        newWidth = startWidth + deltaX;
        newHeight = startHeight - deltaY;
        
        // Maintain aspect ratio
        if (newWidth / newHeight !== aspectRatio) {
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            newHeight = newWidth / aspectRatio;
          } else {
            newWidth = newHeight * aspectRatio;
          }
        }
        
        newX = fixedCornerX;
        newY = fixedCornerY - newHeight;
      } else if (position === 'se') {
        // Southeast corner (bottom-right)
        newWidth = startWidth + deltaX;
        newHeight = startHeight + deltaY;
        
        // Maintain aspect ratio
        if (newWidth / newHeight !== aspectRatio) {
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            newHeight = newWidth / aspectRatio;
          } else {
            newWidth = newHeight * aspectRatio;
          }
        }
        
        newX = fixedCornerX;
        newY = fixedCornerY;
      } else if (position === 'sw') {
        // Southwest corner (bottom-left)
        newWidth = startWidth - deltaX;
        newHeight = startHeight + deltaY;
        
        // Maintain aspect ratio
        if (newWidth / newHeight !== aspectRatio) {
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            newHeight = newWidth / aspectRatio;
          } else {
            newWidth = newHeight * aspectRatio;
          }
        }
        
        newX = fixedCornerX - newWidth;
        newY = fixedCornerY;
      }
      
      // Set minimum size
      if (newWidth < 20 || newHeight < 20) {
        return;
      }
      
      // Update the image properties
      image.width = newWidth;
      image.height = newHeight;
      image.x = newX;
      image.y = newY;
      image.scaleFactor = newWidth / image.originalWidth;
      
      // Update the DOM
      this.renderImage(image);
      
      // Update app state
      this.app.state.selectedElement = image;
    };
    
    const endHandler = () => {
      // End resize
      this.app.state.isResizing = false;
      
      // Save state for undo/redo
      this.app.history.saveState();
      
      // Update controls to reflect new size
      this.updateControls();
      
      // Remove event listeners
      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('mouseup', endHandler);
      document.removeEventListener('touchmove', moveHandler);
      document.removeEventListener('touchend', endHandler);
    };
    
    // Attach event listeners
    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', endHandler);
    document.addEventListener('touchmove', moveHandler, { passive: false });
    document.addEventListener('touchend', endHandler);
  }
  
  /**
   * Start rotation operation on an image
   * @param {MouseEvent|TouchEvent} event - The mouse or touch event
   * @param {string} position - The handle position (nw, ne, se, sw)
   * @param {Object} image - The image data object
   */
  startRotate(event, position, image) {
    event.preventDefault();
    
    // Set rotating state
    this.app.state.isRotating = true;
    
    // Get image center as rotation pivot
    const centerX = image.x + image.width / 2;
    const centerY = image.y + image.height / 2;
    
    // Get the image element and its bounding rect
    const imgElement = document.getElementById(image.id);
    const canvasRect = document.getElementById('editor-canvas').getBoundingClientRect();
    
    // Create or update angle indicator
    let angleIndicator = document.getElementById('angle-indicator');
    if (!angleIndicator) {
      angleIndicator = document.createElement('div');
      angleIndicator.id = 'angle-indicator';
      angleIndicator.className = 'snap-angle-indicator';
      document.getElementById('editor-canvas').appendChild(angleIndicator);
    }
    
    // Starting rotation angle
    const startRotation = image.rotation || 0;
    
    // Calculate initial angle between mouse and center
    let startAngle = Math.atan2(
      event.clientY - (canvasRect.top + centerY),
      event.clientX - (canvasRect.left + centerX)
    ) * (180 / Math.PI);
    
    const moveHandler = (moveEvent) => {
      // Get current mouse position
      let clientX, clientY;
      
      if (moveEvent.touches) {
        clientX = moveEvent.touches[0].clientX;
        clientY = moveEvent.touches[0].clientY;
      } else {
        clientX = moveEvent.clientX;
        clientY = moveEvent.clientY;
      }
      
      // Calculate current angle
      let currentAngle = Math.atan2(
        clientY - (canvasRect.top + centerY),
        clientX - (canvasRect.left + centerX)
      ) * (180 / Math.PI);
      
      // Calculate rotation delta
      let rotationDelta = currentAngle - startAngle;
      
      // Calculate new rotation angle
      let newRotation = startRotation + rotationDelta;
      
      // Snap to 45-degree increments
      const snapAngle = 45;
      const snappedRotation = Math.round(newRotation / snapAngle) * snapAngle;
      
      // Check if we're close to a snap point
      const snapThreshold = 10; // degrees
      if (Math.abs(newRotation - snappedRotation) < snapThreshold) {
        newRotation = snappedRotation;
        
        // Show snap indicator
        angleIndicator.textContent = `${newRotation}°`;
        angleIndicator.style.opacity = 1;
        angleIndicator.style.left = `${centerX}px`;
        angleIndicator.style.top = `${centerY - 40}px`;
      } else {
        angleIndicator.style.opacity = 0;
      }
      
      // Update image rotation
      image.rotation = newRotation;
      
      // Update the image
      this.renderImage(image);
      
      // Update app state
      this.app.state.selectedElement = image;
      
      // Update control panel rotation slider
      const rotationInput = document.getElementById('image-rotation');
      const rotationValue = document.getElementById('image-rotation-value');
      if (rotationInput && rotationValue) {
        rotationInput.value = Math.round(newRotation) % 360;
        rotationValue.textContent = `${Math.round(newRotation) % 360}°`;
      }
    };
    
    const endHandler = () => {
      // End rotation
      this.app.state.isRotating = false;
      
      // Normalize rotation angle to 0-360
      image.rotation = ((image.rotation % 360) + 360) % 360;
      
      // Hide angle indicator
      if (angleIndicator) {
        angleIndicator.style.opacity = 0;
      }
      
      // Save state for undo/redo
      this.app.history.saveState();
      
      // Update controls
      this.updateControls();
      
      // Update the image
      this.renderImage(image);
      
      // Remove event listeners
      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('mouseup', endHandler);
      document.removeEventListener('touchmove', moveHandler);
      document.removeEventListener('touchend', endHandler);
    };
    
    // Attach event listeners
    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', endHandler);
    document.addEventListener('touchmove', moveHandler, { passive: false });
    document.addEventListener('touchend', endHandler);
  }
  
  /**
   * Select an image by index
   * @param {number} index - The index of the image to select
   */
  selectImage(index) {
    // Clear any existing selection
    this.clearSelection();
    
    if (index >= 0 && index < this.images.length) {
      // Set the selected image
      this.app.state.selectedElement = this.images[index];
      this.app.state.elementType = 'image';
      
      // Add selected class to the image element
      const imgElement = document.getElementById(this.images[index].id);
      if (imgElement) {
        imgElement.classList.add('selected');
      }
      
      // Show transform handles
      this.updateTransformHandles(this.images[index]);
      
      // Show image controls
      this.updateControls();
    }
  }
  
  /**
   * Clear the current selection
   */
  clearSelection() {
    // Remove selected class from all images
    document.querySelectorAll('.image-item').forEach(el => {
      el.classList.remove('selected');
    });
    
    // Remove transform handles
    this.removeAllTransformHandles();
    
    // Hide image controls if we're deselecting an image
    if (this.app.state.elementType === 'image') {
      document.getElementById('image-controls').style.display = 'none';
    }
  }
  
  /**
   * Remove all transform handles from the canvas
   */
  removeAllTransformHandles() {
    document.querySelectorAll('.transform-handle').forEach(handle => {
      if (handle.parentNode) {
        handle.parentNode.removeChild(handle);
      }
    });
    
    const angleIndicator = document.getElementById('angle-indicator');
    if (angleIndicator && angleIndicator.parentNode) {
      angleIndicator.parentNode.removeChild(angleIndicator);
    }
  }
  
  /**
   * Update image controls based on selection
   */
  updateControls() {
    const imageControls = document.getElementById('image-controls');
    const imageScale = document.getElementById('image-scale');
    const imageScaleValue = document.getElementById('image-scale-value');
    const imageRotation = document.getElementById('image-rotation');
    const imageRotationValue = document.getElementById('image-rotation-value');
    
    if (this.app.state.elementType === 'image' && this.app.state.selectedElement) {
      // Show image controls
      imageControls.style.display = 'block';
      
      // Update scale slider
      const scaleFactor = this.app.state.selectedElement.scaleFactor * 100;
      imageScale.value = scaleFactor;
      imageScaleValue.textContent = `${Math.round(scaleFactor)}%`;
      
      // Update rotation slider
      const rotation = this.app.state.selectedElement.rotation || 0;
      imageRotation.value = rotation;
      imageRotationValue.textContent = `${Math.round(rotation)}°`;
    } else {
      // Hide image controls
      imageControls.style.display = 'none';
    }
  }
  
  /**
   * Update the scale and rotation of the selected image
   */
  updateImageTransform() {
    if (this.app.state.elementType === 'image' && this.app.state.selectedElement) {
      const scaleInput = document.getElementById('image-scale');
      const scaleValue = document.getElementById('image-scale-value');
      const rotationInput = document.getElementById('image-rotation');
      const rotationValue = document.getElementById('image-rotation-value');
      const keepAspectRatio = document.getElementById('keep-aspect-ratio').checked;
      
      const newScale = parseInt(scaleInput.value) / 100;
      const newRotation = parseInt(rotationInput.value);
      
      // Update displayed values
      scaleValue.textContent = `${scaleInput.value}%`;
      rotationValue.textContent = `${newRotation}°`;
      
      // Find the image index
      const index = this.images.findIndex(img => img.id === this.app.state.selectedElement.id);
      if (index !== -1) {
        const img = this.images[index];
        
        // Calculate new dimensions
        const originalWidth = img.originalWidth || img.width / img.scaleFactor;
        const originalHeight = img.originalHeight || img.height / img.scaleFactor;
        
        // Calculate center position (pivot for transformations)
        const centerX = img.x + (img.width / 2);
        const centerY = img.y + (img.height / 2);
        
        // Calculate new dimensions while maintaining aspect ratio if checked
        let newWidth, newHeight;
        
        if (keepAspectRatio) {
          // Keep aspect ratio
          newWidth = originalWidth * newScale;
          newHeight = originalHeight * newScale;
        } else {
          // Allow independent scaling (not fully implemented in this version)
          newWidth = originalWidth * newScale;
          newHeight = originalHeight * newScale;
        }
        
        // Update image properties
        img.width = newWidth;
        img.height = newHeight;
        img.x = centerX - (newWidth / 2);
        img.y = centerY - (newHeight / 2);
        img.scaleFactor = newScale;
        img.rotation = newRotation;
        
        // Update the image element
        this.renderImage(img);
        
        // Update app state
        this.app.state.selectedElement = img;
        
        // Save state for undo/redo (debounced)
        this.debounceHistorySave();
      }
    }
  }
  
  /**
   * Debounce history save to avoid too many states when dragging sliders
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
   * Reset the transform of the selected image
   */
  resetImageTransform() {
    if (this.app.state.elementType === 'image' && this.app.state.selectedElement) {
      // Find the image index
      const index = this.images.findIndex(img => img.id === this.app.state.selectedElement.id);
      if (index !== -1) {
        const img = this.images[index];
        const originalWidth = img.originalWidth;
        const originalHeight = img.originalHeight;
        
        // Calculate center position
        const centerX = img.x + (img.width / 2);
        const centerY = img.y + (img.height / 2);
        
        // Get canvas dimensions for scaling
        const canvas = document.getElementById('editor-canvas');
        const canvasWidth = canvas.clientWidth;
        const canvasHeight = canvas.clientHeight;
        
        let width = originalWidth;
        let height = originalHeight;
        
        // Scale down if too large for canvas
        if (width > canvasWidth - 40 || height > canvasHeight - 40) {
          const scale = Math.min(
            (canvasWidth - 40) / width,
            (canvasHeight - 40) / height
          );
          width *= scale;
          height *= scale;
        }
        
        // Update image properties
        img.width = width;
        img.height = height;
        img.x = centerX - (width / 2);
        img.y = centerY - (height / 2);
        img.scaleFactor = width / originalWidth;
        img.rotation = 0;
        
        // Update controls display
        this.updateControls();
        
        // Update the image element
        this.renderImage(img);
        
        // Update app state
        this.app.state.selectedElement = img;
        
        // Save state for undo/redo
        this.app.history.saveState();
        
        // Notify user
        this.app.toast.show('Image transform reset', 'info');
      }
    }
  }
  
  /**
   * Delete the selected image
   */
  deleteSelectedImage() {
    if (this.app.state.elementType === 'image' && this.app.state.selectedElement) {
      // Find the image index
      const index = this.images.findIndex(img => img.id === this.app.state.selectedElement.id);
      if (index !== -1) {
        // Remove the image element from DOM
        const imageElement = document.getElementById(this.images[index].id);
        if (imageElement) {
          imageElement.parentElement.removeChild(imageElement);
        }
        
        // Remove from array
        this.images.splice(index, 1);
        
        // Clear selection
        this.app.state.selectedElement = null;
        this.app.state.elementType = null;
        
        // Hide controls
        document.getElementById('image-controls').style.display = 'none';
        
        // Show drop zone if no images left
        if (this.images.length === 0 && this.app.text.getTexts().length === 0) {
          this.app.canvas.showDropZone();
        }
        
        // Save state for undo/redo
        this.app.history.saveState();
        
        // Notify user
        this.app.toast.show('Image deleted', 'info');
      }
    }
  }
  
  /**
   * Bring the selected image to the front
   */
  bringSelectedImageToFront() {
    if (this.app.state.elementType === 'image' && this.app.state.selectedElement) {
      // Find the image index
      const index = this.images.findIndex(img => img.id === this.app.state.selectedElement.id);
      if (index !== -1 && index < this.images.length - 1) {
        // Remove from current position
        const image = this.images.splice(index, 1)[0];
        
        // Add to end of array (top of z-index)
        this.images.push(image);
        
        // Re-render images to update z-index
        this.renderAllImages();
        
        // Update selection
        this.selectImage(this.images.length - 1);
        
        // Save state for undo/redo
        this.app.history.saveState();
      }
    }
  }
  
  /**
   * Send the selected image to the back
   */
  sendSelectedImageToBack() {
    if (this.app.state.elementType === 'image' && this.app.state.selectedElement) {
      // Find the image index
      const index = this.images.findIndex(img => img.id === this.app.state.selectedElement.id);
      if (index !== -1 && index > 0) {
        // Remove from current position
        const image = this.images.splice(index, 1)[0];
        
        // Add to beginning of array (bottom of z-index)
        this.images.unshift(image);
        
        // Re-render images to update z-index
        this.renderAllImages();
        
        // Update selection
        this.selectImage(0);
        
        // Save state for undo/redo
        this.app.history.saveState();
      }
    }
  }
  
  /**
   * Render all images based on their order in the array
   */
  renderAllImages() {
    // First, temporarily remove all images
    document.querySelectorAll('.image-item').forEach(el => {
      el.remove();
    });
    
    // Then render them in order (first = bottom, last = top)
    this.images.forEach(image => {
      this.renderImage(image);
    });
  }
  
  /**
   * Load template images into the template container
   */
  loadTemplates() {
    // Default template images
    const templates = [
      { src: 'https://i.imgflip.com/1bij.jpg', name: 'One Does Not Simply' },
      { src: 'https://i.imgflip.com/1g8my4.jpg', name: 'Two Buttons' },
      { src: 'https://i.imgflip.com/1bgw.jpg', name: 'Distracted Boyfriend' },
      { src: 'https://i.imgflip.com/1bh8.jpg', name: 'Batman Slapping Robin' },
      { src: 'https://i.imgflip.com/1ihzfe.jpg', name: 'Expanding Brain' },
      { src: 'https://i.imgflip.com/1h7in3.jpg', name: 'Who Would Win?' },
      { src: 'https://i.imgflip.com/9ehk.jpg', name: 'Black Girl Wat' }
    ];
    
    const templatesContainer = document.getElementById('templates-container');
    if (templatesContainer) {
      templates.forEach((template, index) => {
        const templateItem = document.createElement('div');
        templateItem.className = 'template-item';
        templateItem.title = template.name;
        
        const img = document.createElement('img');
        img.src = template.src;
        img.alt = template.name;
        img.loading = 'lazy';
        
        templateItem.appendChild(img);
        templatesContainer.appendChild(templateItem);
        
        // Add click event
        templateItem.addEventListener('click', () => {
          this.loadTemplateImage(template.src);
        });
      });
    }
  }
  
  /**
   * Load a template image into the canvas
   * @param {string} src - The image source URL
   */
  loadTemplateImage(src) {
    const img = new Image();
    img.onload = () => {
      this.addImage(img);
    };
    img.onerror = () => {
      this.app.toast.show('Failed to load template image', 'error');
    };
    img.src = src;
  }
  
  /**
   * Get all images
   * @returns {Array} The array of images
   */
  getImages() {
    return this.images;
  }
  
  /**
   * Set images from history state
   * @param {Array} images - The array of images to set
   */
  setImages(images) {
    this.images = images;
    this.renderAllImages();
  }
  
  /**
   * Reset all images
   */
  reset() {
    // Remove all image elements
    document.querySelectorAll('.image-item').forEach(el => {
      el.remove();
    });
    
    // Clear images array
    this.images = [];
  }
  
  /**
   * Start dragging an image
   * @param {MouseEvent|TouchEvent} event - The mouse or touch event
   * @param {HTMLElement} element - The image DOM element
   * @param {Object} image - The image data object
   */
  startDrag(event, element, image) {
    // Don't start dragging if we're in crop mode
    if (this.app.state.isCropping) return;
    
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
      
      // Check for alignment with other images (snapping)
      const snapThreshold = 10; // pixels
      let snappedH = false;
      let snappedV = false;
      
      // Hide all guides initially
      this.hideAlignmentGuides();
      
      // Check alignment with other images
      this.images.forEach(otherImage => {
        if (otherImage.id === image.id) return; // Skip self
        
        // Center alignment (horizontal)
        const otherCenterX = otherImage.x + otherImage.width / 2;
        const thisCenterX = newLeft + image.width / 2;
        
        if (Math.abs(thisCenterX - otherCenterX) < snapThreshold && !snappedH) {
          newLeft = otherCenterX - image.width / 2;
          this.showAlignmentGuide('vertical', otherCenterX);
          snappedH = true;
        }
        
        // Center alignment (vertical)
        const otherCenterY = otherImage.y + otherImage.height / 2;
        const thisCenterY = newTop + image.height / 2;
        
        if (Math.abs(thisCenterY - otherCenterY) < snapThreshold && !snappedV) {
          newTop = otherCenterY - image.height / 2;
          this.showAlignmentGuide('horizontal', otherCenterY);
          snappedV = true;
        }
        
        // Edge alignments could be added here
      });
      
      // Check alignment with canvas center
      const canvasWidth = this.app.canvas.canvasDimensions.width;
      const canvasHeight = this.app.canvas.canvasDimensions.height;
      const canvasCenterX = canvasWidth / 2;
      const canvasCenterY = canvasHeight / 2;
      
      const thisCenterX = newLeft + image.width / 2;
      const thisCenterY = newTop + image.height / 2;
      
      if (Math.abs(thisCenterX - canvasCenterX) < snapThreshold && !snappedH) {
        newLeft = canvasCenterX - image.width / 2;
        this.showAlignmentGuide('vertical', canvasCenterX);
      }
      
      if (Math.abs(thisCenterY - canvasCenterY) < snapThreshold && !snappedV) {
        newTop = canvasCenterY - image.height / 2;
        this.showAlignmentGuide('horizontal', canvasCenterY);
      }
      
      // Constrain to canvas boundaries
      newLeft = Math.max(0, Math.min(canvasWidth - image.width, newLeft));
      newTop = Math.max(0, Math.min(canvasHeight - image.height, newTop));
      
      // Apply the new position
      element.style.left = `${newLeft}px`;
      element.style.top = `${newTop}px`;
    };
    
    // Set up the end handler
    const endDrag = () => {
      this.app.state.isDragging = false;
      element.classList.remove('dragging');
      
      // Update the image data with new position
      const finalLeft = parseFloat(element.style.left);
      const finalTop = parseFloat(element.style.top);
      
      // Only update if position actually changed
      if (finalLeft !== image.x || finalTop !== image.y) {
        image.x = finalLeft;
        image.y = finalTop;
        
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
   * Create alignment guides for image dragging
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
} 