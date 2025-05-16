/**
 * ClipboardManager - Handles clipboard operations (copy, paste)
 */
export class ClipboardManager {
  constructor() {
    this.app = null;
    this.clipboardData = null;
    this.clipboardType = null; // 'image' or 'text'
  }
  
  /**
   * Initialize the ClipboardManager
   * @param {Object} app - The main application object
   */
  init(app) {
    this.app = app;
    this.setupClipboardEvents();
  }
  
  /**
   * Set up clipboard-related event listeners
   */
  setupClipboardEvents() {
    // Listen for paste events on the document
    document.addEventListener('paste', (e) => {
      // Don't handle paste if user is focused on an input field
      if (this.isEditingText(document.activeElement)) {
        return;
      }
      
      // Handle paste event
      this.handlePaste(e);
    });
  }
  
  /**
   * Handle paste event from clipboard
   * @param {ClipboardEvent} event - The clipboard event
   */
  handlePaste(event) {
    // Prevent default paste behavior
    event.preventDefault();
    
    // Handle image paste
    if (event.clipboardData.items) {
      // Loop through clipboard items
      for (let i = 0; i < event.clipboardData.items.length; i++) {
        const item = event.clipboardData.items[i];
        
        // Handle image item
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            this.createImageFromBlob(blob);
            return;
          }
        }
      }
    }
    
    // Handle text paste
    const text = event.clipboardData.getData('text');
    if (text) {
      this.app.text.addNewText(text);
    }
  }
  
  /**
   * Create an image from a blob and add it to canvas
   * @param {Blob} blob - The image blob
   */
  createImageFromBlob(blob) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.app.image.addImage(img);
        this.app.toast.show('Image pasted from clipboard', 'success');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(blob);
  }
  
  /**
   * Copy an element to the internal clipboard
   * @param {Object} element - The element to copy (image or text object)
   * @param {string} type - The element type ('image' or 'text')
   */
  copyElement(element, type) {
    // Create a copy of the element to avoid reference issues
    this.clipboardData = JSON.parse(JSON.stringify(element));
    this.clipboardType = type;
    
    console.log(`Element copied to internal clipboard: ${type}`);
  }
  
  /**
   * Paste the element from internal clipboard
   * @returns {boolean} Whether the paste was successful
   */
  pasteElement() {
    if (!this.clipboardData || !this.clipboardType) {
      this.app.toast.show('Nothing to paste', 'warning');
      return false;
    }
    
    // Create a deep copy of the clipboard data to avoid reference issues
    const elementCopy = JSON.parse(JSON.stringify(this.clipboardData));
    
    if (this.clipboardType === 'image') {
      // Offset the pasted image slightly from the original
      elementCopy.x += 20;
      elementCopy.y += 20;
      
      // Ensure the image doesn't go off canvas
      const canvas = document.getElementById('editor-canvas');
      if (elementCopy.x + elementCopy.width > canvas.offsetWidth) {
        elementCopy.x = Math.max(0, canvas.offsetWidth - elementCopy.width);
      }
      if (elementCopy.y + elementCopy.height > canvas.offsetHeight) {
        elementCopy.y = Math.max(0, canvas.offsetHeight - elementCopy.height);
      }
      
      this.app.image.addImageFromData(elementCopy);
    } else if (this.clipboardType === 'text') {
      // Offset the pasted text slightly from the original
      elementCopy.x += 20;
      elementCopy.y += 20;
      
      this.app.text.addTextFromData(elementCopy);
    }
    
    return true;
  }
  
  /**
   * Copy the canvas content to the system clipboard as an image
   */
  copyCanvasToClipboard() {
    const canvas = document.getElementById('editor-canvas');
    
    // Use html2canvas to capture the canvas including all elements
    html2canvas(canvas, {
      backgroundColor: null,
      scale: 2, // Higher scale for better quality
      logging: false,
      allowTaint: true,
      useCORS: true
    }).then(tempCanvas => {
      // Create a temporary canvas to get blob
      tempCanvas.toBlob(blob => {
        // Create a ClipboardItem and write to clipboard
        try {
          // Modern clipboard API
          if (navigator.clipboard && navigator.clipboard.write) {
            const clipboardItem = new ClipboardItem({ 'image/png': blob });
            navigator.clipboard.write([clipboardItem]).then(() => {
              this.app.toast.show('Image copied to clipboard', 'success');
            }).catch(err => {
              console.error('Clipboard write failed:', err);
              this.app.toast.show('Failed to copy to clipboard. Try saving instead.', 'error');
            });
          } else {
            // Fallback for browsers that don't support clipboard.write
            this.fallbackCopyCanvas(tempCanvas);
          }
        } catch (err) {
          console.error('Clipboard error:', err);
          this.fallbackCopyCanvas(tempCanvas);
        }
      }, 'image/png');
    }).catch(err => {
      console.error('Error capturing canvas:', err);
      this.app.toast.show('Failed to copy image to clipboard', 'error');
    });
  }
  
  /**
   * Fallback method to copy canvas image
   * @param {HTMLCanvasElement} canvas - The canvas element
   */
  fallbackCopyCanvas(canvas) {
    // Create a temporary link to download the image
    const link = document.createElement('a');
    link.download = 'image-editor-export.png';
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.app.toast.show('Image saved to downloads', 'info');
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
} 