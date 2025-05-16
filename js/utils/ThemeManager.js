/**
 * ThemeManager - Handles theme switching (dark/light mode)
 */
export class ThemeManager {
  constructor() {
    this.app = null;
    this.isDarkMode = true; // Default to dark mode
  }
  
  /**
   * Initialize the ThemeManager
   * @param {Object} app - The main application object
   */
  init(app) {
    this.app = app;
    
    // Check system preference
    this.checkSystemPreference();
    
    // Restore saved preference from localStorage if available
    this.loadSavedPreference();
  }
  
  /**
   * Check system dark mode preference
   */
  checkSystemPreference() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      this.setLightMode(false); // Don't save to storage when initializing
    }
    
    // Listen for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (e.matches) {
        this.setDarkMode(false);
      } else {
        this.setLightMode(false);
      }
    });
  }
  
  /**
   * Load saved theme preference from localStorage
   */
  loadSavedPreference() {
    const savedPreference = localStorage.getItem('darkMode');
    if (savedPreference !== null) {
      if (savedPreference === 'true') {
        this.setDarkMode(false);
      } else {
        this.setLightMode(false);
      }
    }
  }
  
  /**
   * Toggle between dark and light mode
   */
  toggle() {
    if (this.isDarkMode) {
      this.setLightMode();
    } else {
      this.setDarkMode();
    }
    return this.isDarkMode;
  }
  
  /**
   * Set dark mode
   * @param {boolean} savePreference - Whether to save the preference to localStorage
   */
  setDarkMode(savePreference = true) {
    document.body.classList.add('dark-mode');
    document.body.classList.remove('light-mode');
    this.isDarkMode = true;
    
    if (savePreference) {
      localStorage.setItem('darkMode', 'true');
      this.app?.toast?.show('Dark mode enabled', 'info');
    }
    
    this.updateThemeUI();
  }
  
  /**
   * Set light mode
   * @param {boolean} savePreference - Whether to save the preference to localStorage
   */
  setLightMode(savePreference = true) {
    document.body.classList.add('light-mode');
    document.body.classList.remove('dark-mode');
    this.isDarkMode = false;
    
    if (savePreference) {
      localStorage.setItem('darkMode', 'false');
      this.app?.toast?.show('Light mode enabled', 'info');
    }
    
    this.updateThemeUI();
  }
  
  /**
   * Update UI elements based on current theme
   */
  updateThemeUI() {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
      // Update the icon
      const icon = darkModeToggle.querySelector('i');
      if (icon) {
        if (this.isDarkMode) {
          icon.className = 'fas fa-sun';
          darkModeToggle.title = 'Switch to Light Mode (Ctrl+I or Cmd+I)';
        } else {
          icon.className = 'fas fa-moon';
          darkModeToggle.title = 'Switch to Dark Mode (Ctrl+I or Cmd+I)';
        }
      }
    }
  }
} 