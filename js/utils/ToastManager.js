/**
 * ToastManager - Handles toast notifications throughout the application
 */
export class ToastManager {
  constructor() {
    this.app = null;
    this.container = null;
    this.toasts = [];
    this.autoHideDelay = 3000; // Default auto-hide delay in ms
  }
  
  /**
   * Initialize the ToastManager
   * @param {Object} app - The main application object
   */
  init(app) {
    this.app = app;
    this.createToastContainer();
  }
  
  /**
   * Create the toast container element
   */
  createToastContainer() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  }
  
  /**
   * Show a toast notification
   * @param {string} message - The message to display
   * @param {string} [type='info'] - Toast type ('info', 'success', 'warning', 'error')
   * @param {number} [duration=3000] - How long to show the toast in ms
   */
  show(message, type = 'info', duration = this.autoHideDelay) {
    // Create a new toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Create content container
    const content = document.createElement('div');
    content.className = 'toast-content';
    
    // Create a title based on type
    const title = document.createElement('div');
    title.className = 'toast-title';
    
    switch (type) {
      case 'success':
        title.textContent = 'Success';
        break;
      case 'warning':
        title.textContent = 'Warning';
        break;
      case 'error':
        title.textContent = 'Error';
        break;
      default:
        title.textContent = 'Info';
    }
    
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = 'toast-message';
    messageEl.textContent = message;
    
    // Create close button
    const closeBtn = document.createElement('span');
    closeBtn.className = 'toast-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => {
      this.removeToast(toast);
    });
    
    // Assemble toast
    content.appendChild(title);
    content.appendChild(messageEl);
    toast.appendChild(content);
    toast.appendChild(closeBtn);
    
    // Add to container
    this.container.appendChild(toast);
    
    // Store reference
    this.toasts.push(toast);
    
    // Auto-remove after delay
    if (duration > 0) {
      setTimeout(() => {
        this.removeToast(toast);
      }, duration);
    }
    
    return toast;
  }
  
  /**
   * Remove a toast notification
   * @param {HTMLElement} toast - The toast element to remove
   */
  removeToast(toast) {
    // Check if toast exists
    if (!toast || !this.container.contains(toast)) {
      return;
    }
    
    // Add exit animation class
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    
    // Remove after animation completes
    setTimeout(() => {
      if (toast.parentNode === this.container) {
        this.container.removeChild(toast);
      }
      
      // Remove from array
      const index = this.toasts.indexOf(toast);
      if (index !== -1) {
        this.toasts.splice(index, 1);
      }
    }, 300); // Match the CSS transition duration
  }
  
  /**
   * Clear all toast notifications
   */
  clearAll() {
    // Clone the array to avoid issues during iteration
    const toastsToRemove = [...this.toasts];
    toastsToRemove.forEach(toast => {
      this.removeToast(toast);
    });
  }
  
  /**
   * Show a success toast
   * @param {string} message - The message to display
   * @param {number} [duration=3000] - How long to show the toast in ms
   */
  success(message, duration = this.autoHideDelay) {
    return this.show(message, 'success', duration);
  }
  
  /**
   * Show a warning toast
   * @param {string} message - The message to display
   * @param {number} [duration=3000] - How long to show the toast in ms
   */
  warning(message, duration = this.autoHideDelay) {
    return this.show(message, 'warning', duration);
  }
  
  /**
   * Show an error toast
   * @param {string} message - The message to display
   * @param {number} [duration=3000] - How long to show the toast in ms
   */
  error(message, duration = this.autoHideDelay) {
    return this.show(message, 'error', duration);
  }
  
  /**
   * Show an info toast
   * @param {string} message - The message to display
   * @param {number} [duration=3000] - How long to show the toast in ms
   */
  info(message, duration = this.autoHideDelay) {
    return this.show(message, 'info', duration);
  }
} 