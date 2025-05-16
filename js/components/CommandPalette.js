/**
 * CommandPalette - Handles the command palette for quick access to app features
 */
export class CommandPalette {
  constructor() {
    this.app = null;
    this.element = null;
    this.input = null;
    this.resultsContainer = null;
    this.commands = [];
    this.filteredCommands = [];
    this.selectedIndex = 0;
    this._isOpen = false;
  }
  
  /**
   * Initialize the CommandPalette
   * @param {Object} app - The main application object
   */
  init(app) {
    this.app = app;
    this.createCommandPalette();
    this.registerCommands();
    this.setupEventListeners();
  }
  
  /**
   * Create the command palette DOM element
   */
  createCommandPalette() {
    // Create palette element if it doesn't exist
    if (!this.element) {
      // Create main element
      this.element = document.createElement('div');
      this.element.className = 'command-palette';
      
      // Create header with search
      const header = document.createElement('div');
      header.className = 'command-palette-header';
      
      const searchContainer = document.createElement('div');
      searchContainer.className = 'command-palette-search';
      
      const searchIcon = document.createElement('i');
      searchIcon.className = 'fas fa-search';
      
      this.input = document.createElement('input');
      this.input.className = 'command-palette-input';
      this.input.type = 'text';
      this.input.placeholder = 'Search commands... (e.g. "dark mode", "export")';
      this.input.addEventListener('input', () => this.filterCommands());
      this.input.addEventListener('keydown', (e) => this.handleKeyNavigation(e));
      
      searchContainer.appendChild(searchIcon);
      searchContainer.appendChild(this.input);
      header.appendChild(searchContainer);
      
      // Create results container
      this.resultsContainer = document.createElement('div');
      this.resultsContainer.className = 'command-palette-results';
      
      // Assemble the palette
      this.element.appendChild(header);
      this.element.appendChild(this.resultsContainer);
      
      // Add to document
      document.body.appendChild(this.element);
    }
  }
  
  /**
   * Register all available commands
   */
  registerCommands() {
    // Basic commands
    this.commands = [
      {
        id: 'toggle-dark-mode',
        title: 'Toggle Dark Mode',
        description: 'Switch between light and dark theme',
        icon: 'fas fa-moon',
        shortcut: ['Ctrl+I', 'Cmd+I'],
        action: () => this.app.theme.toggle()
      },
      {
        id: 'export-image',
        title: 'Export Image',
        description: 'Download the current canvas as PNG image',
        icon: 'fas fa-download',
        shortcut: ['Ctrl+S', 'Cmd+S'],
        action: () => this.app.exportImage()
      },
      {
        id: 'crop-image',
        title: 'Crop Image',
        description: 'Crop the selected image',
        icon: 'fas fa-crop-alt',
        shortcut: ['Ctrl+X', 'Cmd+X'],
        action: () => this.app.image.startCrop()
      },
      {
        id: 'copy-to-clipboard',
        title: 'Copy to Clipboard',
        description: 'Copy the current canvas to clipboard',
        icon: 'fas fa-clipboard',
        shortcut: ['Ctrl+Shift+C', 'Cmd+Shift+C'],
        action: () => this.app.clipboard.copyCanvasToClipboard()
      },
      {
        id: 'reset-canvas',
        title: 'Reset Canvas',
        description: 'Clear the canvas and start over',
        icon: 'fas fa-trash-alt',
        action: () => this.app.reset()
      },
      {
        id: 'add-text',
        title: 'Add Text',
        description: 'Add new text to the canvas',
        icon: 'fas fa-font',
        action: () => this.app.text.addNewText()
      },
      {
        id: 'aspect-1-1',
        title: 'Square Canvas (1:1)',
        description: 'Change canvas to square aspect ratio',
        icon: 'fas fa-square',
        action: () => this.app.setAspectRatio('1:1')
      },
      {
        id: 'aspect-16-9',
        title: 'Landscape Canvas (16:9)',
        description: 'Change canvas to widescreen aspect ratio',
        icon: 'fas fa-rectangle-landscape',
        action: () => this.app.setAspectRatio('16:9')
      },
      {
        id: 'aspect-9-16',
        title: 'Portrait Canvas (9:16)',
        description: 'Change canvas to mobile/portrait aspect ratio',
        icon: 'fas fa-rectangle-portrait',
        action: () => this.app.setAspectRatio('9:16')
      },
    ];
  }
  
  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (this._isOpen && !this.element.contains(e.target)) {
        this.close();
      }
    });
    
    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._isOpen) {
        e.preventDefault();
        this.close();
      }
    });
  }
  
  /**
   * Open the command palette
   */
  open() {
    if (!this._isOpen) {
      this.element.classList.add('open');
      this._isOpen = true;
      
      // Reset and focus input
      this.input.value = '';
      this.filterCommands();
      this.input.focus();
    }
  }
  
  /**
   * Close the command palette
   */
  close() {
    if (this._isOpen) {
      this.element.classList.remove('open');
      this._isOpen = false;
      this.input.blur();
    }
  }
  
  /**
   * Toggle the command palette open/closed state
   */
  toggle() {
    if (this._isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
  
  /**
   * Filter commands based on the search input
   */
  filterCommands() {
    const searchTerm = this.input.value.toLowerCase();
    this.filteredCommands = this.commands.filter(command => {
      return command.title.toLowerCase().includes(searchTerm) || 
             command.description.toLowerCase().includes(searchTerm);
    });
    
    this.selectedIndex = 0;
    this.renderResults();
  }
  
  /**
   * Render the filtered command results
   */
  renderResults() {
    // Clear previous results
    this.resultsContainer.innerHTML = '';
    
    if (this.filteredCommands.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'command-palette-item';
      noResults.textContent = 'No commands found';
      this.resultsContainer.appendChild(noResults);
      return;
    }
    
    // Create and append command items
    this.filteredCommands.forEach((command, index) => {
      const item = document.createElement('div');
      item.className = 'command-palette-item';
      if (index === this.selectedIndex) {
        item.classList.add('selected');
      }
      
      const icon = document.createElement('div');
      icon.className = 'command-palette-icon';
      const iconElement = document.createElement('i');
      iconElement.className = command.icon;
      icon.appendChild(iconElement);
      
      const content = document.createElement('div');
      content.className = 'command-palette-content';
      
      const title = document.createElement('div');
      title.className = 'command-palette-title';
      title.textContent = command.title;
      
      const description = document.createElement('div');
      description.className = 'command-palette-description';
      description.textContent = command.description;
      
      content.appendChild(title);
      content.appendChild(description);
      
      item.appendChild(icon);
      item.appendChild(content);
      
      // Add shortcut if available
      if (command.shortcut && command.shortcut.length) {
        const shortcutContainer = document.createElement('div');
        shortcutContainer.className = 'command-palette-shortcut';
        
        const shortcut = Array.isArray(command.shortcut) ? command.shortcut[0] : command.shortcut;
        shortcut.split('+').forEach(key => {
          const keyElement = document.createElement('span');
          keyElement.className = 'command-palette-key';
          keyElement.textContent = key;
          shortcutContainer.appendChild(keyElement);
        });
        
        item.appendChild(shortcutContainer);
      }
      
      // Add click event
      item.addEventListener('click', () => {
        this.executeCommand(command);
      });
      
      this.resultsContainer.appendChild(item);
    });
  }
  
  /**
   * Handle keyboard navigation in the command palette
   * @param {KeyboardEvent} event - The keyboard event
   */
  handleKeyNavigation(event) {
    // Arrow up/down for navigation
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredCommands.length - 1);
      this.renderResults();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
      this.renderResults();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (this.filteredCommands[this.selectedIndex]) {
        this.executeCommand(this.filteredCommands[this.selectedIndex]);
      }
    }
  }
  
  /**
   * Execute a command and close the palette
   * @param {Object} command - The command to execute
   */
  executeCommand(command) {
    this.close();
    
    // Small delay to allow animations to complete
    setTimeout(() => {
      command.action();
    }, 100);
  }
  
  /**
   * Check if the command palette is currently open
   * @returns {boolean} True if the palette is open
   */
  isOpen() {
    return this._isOpen;
  }
} 