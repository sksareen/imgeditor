document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const canvas = document.getElementById('editor-canvas');
    const dropMessage = document.getElementById('drop-message');
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    const exportBtn = document.getElementById('export-btn');
    const addTextBtn = document.getElementById('add-text-btn');
    const uploadImage = document.getElementById('upload-image');
    const templatesContainer = document.getElementById('templates-container');
    
    // New elements
    const resetBtn = document.getElementById('reset-btn');
    const autoSizeBtn = document.getElementById('auto-size-btn');
    const aspectRatio = document.getElementById('aspect-ratio');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    
    // Text controls
    const textControls = document.getElementById('text-controls');
    const textInput = document.getElementById('text-input');
    const textSize = document.getElementById('text-size');
    const textSizeValue = document.getElementById('text-size-value');
    const textColor = document.getElementById('text-color');
    const positionTop = document.getElementById('position-top');
    const positionBottom = document.getElementById('position-bottom');
    const deleteTextBtn = document.getElementById('delete-text-btn');
    
    // Image controls
    const imageControls = document.getElementById('image-controls');
    const imageScale = document.getElementById('image-scale');
    const imageScaleValue = document.getElementById('image-scale-value');
    const deleteImageBtn = document.getElementById('delete-image-btn');
    const bringFrontBtn = document.getElementById('bring-front-btn');
    const sendBackBtn = document.getElementById('send-back-btn');
    
    // State
    let images = [];
    let texts = [];
    let historyStates = [];
    let currentHistoryIndex = -1;
    let isDragging = false;
    let isResizing = false;
    let resizeDirection = '';
    let selectedImageIndex = -1;
    let selectedTextIndex = -1;
    let dragStartX, dragStartY;
    let initialX, initialY;
    let initialWidth, initialHeight;
    let currentAspectRatio = { width: 1, height: 1 }; // Default to square
    let isDarkMode = true;
    
    // Default template images - add your own template URLs here
    const templates = [
        { src: 'https://i.imgflip.com/1bij.jpg', name: 'One Does Not Simply' },
        { src: 'https://i.imgflip.com/1g8my4.jpg', name: 'Two Buttons' },
        { src: 'https://i.imgflip.com/1bgw.jpg', name: 'Distracted Boyfriend' },
        { src: 'https://i.imgflip.com/1bh8.jpg', name: 'Batman Slapping Robin' },
        { src: 'https://i.imgflip.com/1ihzfe.jpg', name: 'Expanding Brain' },
        { src: 'https://i.imgflip.com/1h7in3.jpg', name: 'Who Would Win?' },
        { src: 'https://i.imgflip.com/9ehk.jpg', name: 'Black Girl Wat' }
    ];
    
    // Initialize
    initializeTemplates();
    
    // Initialize with default aspect ratio (1:1)
    updateCanvasAspectRatio('1:1');
    
    // Event listeners
    canvas.addEventListener('dragover', handleDragOver);
    canvas.addEventListener('drop', handleDrop);
    canvas.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // New button event listeners
    resetBtn.addEventListener('click', resetCanvas);
    autoSizeBtn.addEventListener('click', arrangeImagesOptimally);
    
    // Fix aspect ratio toggles
    const aspectRatioToggles = document.querySelectorAll('.aspect-toggle');
    aspectRatioToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            // Remove active class from all toggles
            aspectRatioToggles.forEach(t => t.classList.remove('active'));
            // Add active class to clicked toggle
            this.classList.add('active');
            // Update aspect ratio
            updateCanvasAspectRatio(this.dataset.ratio);
        });
    });
    
    darkModeToggle.addEventListener('click', toggleDarkMode);
    
    // Add keyboard event listener for delete keys
    document.addEventListener('keydown', function(e) {
        // Delete or Backspace key when an image or text is selected
        if ((e.key === 'Delete' || e.key === 'Backspace') && 
            (document.activeElement === document.body || document.activeElement === canvas)) {
            if (selectedImageIndex !== -1) {
                deleteSelectedImage();
                e.preventDefault(); // Prevent browser back navigation on backspace
            } else if (selectedTextIndex !== -1) {
                deleteSelectedText();
                e.preventDefault();
            }
        }
        
        // Toggle dark mode with Cmd+I (macOS) or Ctrl+I (Windows/Linux)
        if ((e.key === 'i' || e.key === 'I') && (e.metaKey || e.ctrlKey)) {
            toggleDarkMode();
            e.preventDefault();  // Prevent default browser behavior
        }
    });
    
    // Text controls
    textSize.addEventListener('input', updateTextSize);
    textSizeValue.textContent = `${textSize.value}px`;
    textInput.addEventListener('input', updateSelectedText);
    textColor.addEventListener('input', updateTextColor);
    
    positionTop.addEventListener('click', () => positionText('top'));
    positionBottom.addEventListener('click', () => positionText('bottom'));
    deleteTextBtn.addEventListener('click', deleteSelectedText);
    
    addTextBtn.addEventListener('click', addNewText);
    
    // Image controls
    imageScale.addEventListener('input', updateImageScale);
    deleteImageBtn.addEventListener('click', deleteSelectedImage);
    bringFrontBtn.addEventListener('click', bringSelectedImageToFront);
    sendBackBtn.addEventListener('click', sendSelectedImageToBack);
    
    // File upload
    uploadImage.addEventListener('change', handleFileUpload);
    
    // Action listeners
    undoBtn.addEventListener('click', handleUndo);
    redoBtn.addEventListener('click', handleRedo);
    exportBtn.addEventListener('click', exportAsPNG);
    
    // Initialize template grid
    function initializeTemplates() {
        templates.forEach((template, index) => {
            const templateItem = document.createElement('div');
            templateItem.className = 'template-item';
            templateItem.title = template.name;
            
            const img = document.createElement('img');
            img.src = template.src;
            img.alt = template.name;
            
            templateItem.appendChild(img);
            templateItem.addEventListener('click', () => loadTemplate(template.src));
            
            templatesContainer.appendChild(templateItem);
        });
    }
    
    // Load a template image
    function loadTemplate(src) {
        const img = new Image();
        
        img.onload = function() {
            // Clear existing content
            images = [];
            texts = [];
            
            // Calculate size to fit canvas while maintaining aspect ratio
            const canvasWidth = canvas.clientWidth;
            const canvasHeight = canvas.clientHeight;
            let width = img.width;
            let height = img.height;
            
            if (width > canvasWidth - 40 || height > canvasHeight - 40) {
                const ratio = Math.min(
                    (canvasWidth - 40) / width,
                    (canvasHeight - 40) / height
                );
                width *= ratio;
                height *= ratio;
            }
            
            const newImage = {
                src: src,
                width: img.width,
                height: img.height,
                x: (canvasWidth - width) / 2,
                y: (canvasHeight - height) / 2,
                scaleFactor: width / img.width
            };
            
            images.push(newImage);
            saveState();
            hideDropZone();
            updateUI();
        };
        
        img.src = src;
        showLoading("Loading template...");
    }
    
    // Handle responsive canvas sizing based on device
    function getOptimalCanvasSize() {
        const screenWidth = window.innerWidth;
        let maxWidth, maxHeight;
        
        if (screenWidth <= 320) {
            maxWidth = maxHeight = 280; // Small phones
        } else if (screenWidth <= 480) {
            maxWidth = maxHeight = 380; // Medium phones
        } else if (screenWidth <= 768) {
            maxWidth = maxHeight = 500; // Tablets
        } else {
            maxWidth = maxHeight = 600; // Desktop
        }
        
        return { maxWidth, maxHeight };
    }
    
    // Update the canvas size on window resize
    window.addEventListener('resize', function() {
        updateCanvasSize();
    });
    
    // Helper functions
    function handleDragOver(e) {
        e.preventDefault();
        canvas.style.borderColor = '#4CAF50';
        dropMessage.textContent = 'Release to add image';
    }
    
    function handleDrop(e) {
        e.preventDefault();
        canvas.style.borderColor = '#ccc';
        dropMessage.textContent = 'Upload image or choose a template';
        
        if (e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                processImageFile(file);
            }
        }
    }
    
    function handleFileUpload(e) {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            if (file.type.startsWith('image/')) {
                processImageFile(file);
            }
        }
    }
    
    function processImageFile(file) {
        showLoading("Loading image...");
        
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                // Calculate size to fit canvas while maintaining aspect ratio
                const canvasWidth = canvas.clientWidth;
                const canvasHeight = canvas.clientHeight;
                let width = img.width;
                let height = img.height;
                
                if (width > canvasWidth - 40 || height > canvasHeight - 40) {
                    const ratio = Math.min(
                        (canvasWidth - 40) / width,
                        (canvasHeight - 40) / height
                    );
                    width *= ratio;
                    height *= ratio;
                }
                
                const newImage = {
                    src: event.target.result,
                    width: img.width,
                    height: img.height,
                    x: (canvasWidth - width) / 2,
                    y: (canvasHeight - height) / 2,
                    scaleFactor: width / img.width
                };
                
                images.push(newImage);
                saveState();
                updateUI();
                hideDropZone();
                hideLoading();
            };
            
            img.onerror = function() {
                hideLoading();
                alert("Error loading image. Please try another file.");
            };
            
            img.src = event.target.result;
        };
        
        reader.readAsDataURL(file);
    }
    
    function hideDropZone() {
        const dropZone = canvas.querySelector('.drop-zone');
        if (dropZone && images.length > 0) {
            dropZone.style.display = 'none';
        }
    }
    
    function showDropZone() {
        const dropZone = canvas.querySelector('.drop-zone');
        if (dropZone) {
            dropZone.style.display = 'flex';
        }
    }
    
    function handleMouseDown(e) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Reset selected state
        selectedImageIndex = -1;
        selectedTextIndex = -1;
        
        // First check if clicked on a resize handle
        const resizeHandle = e.target.closest('.resize-handle');
        if (resizeHandle) {
            isResizing = true;
            resizeDirection = resizeHandle.classList.contains('nw') ? 'nw' : 
                              resizeHandle.classList.contains('ne') ? 'ne' : 
                              resizeHandle.classList.contains('sw') ? 'sw' : 'se';
            
            const imageElement = resizeHandle.parentElement;
            const imageIndex = Array.from(canvas.querySelectorAll('.image-item')).indexOf(imageElement);
            
            if (imageIndex !== -1) {
                selectedImageIndex = imageIndex;
                dragStartX = x;
                dragStartY = y;
                const img = images[selectedImageIndex];
                initialWidth = img.width * img.scaleFactor;
                initialHeight = img.height * img.scaleFactor;
                initialX = img.x;
                initialY = img.y;
                
                updateControls();
                updateUI();
                return;
            }
        }
        
        // Then check if clicked on a text element (higher z-index)
        for (let i = texts.length - 1; i >= 0; i--) {
            const text = texts[i];
            const textElement = document.getElementById(`text-${i}`);
            if (textElement) {
                const textRect = textElement.getBoundingClientRect();
                const relativeRect = {
                    left: textRect.left - rect.left,
                    top: textRect.top - rect.top,
                    right: textRect.right - rect.left,
                    bottom: textRect.bottom - rect.top
                };
                
                if (x >= relativeRect.left && x <= relativeRect.right && 
                    y >= relativeRect.top && y <= relativeRect.bottom) {
                    isDragging = true;
                    selectedTextIndex = i;
                    dragStartX = x;
                    dragStartY = y;
                    initialX = text.x;
                    initialY = text.y;
                    
                    updateControls();
                    updateUI();
                    return;
                }
            }
        }
        
        // Then check if clicked on an image
        for (let i = images.length - 1; i >= 0; i--) {
            const img = images[i];
            const imgWidth = img.width * img.scaleFactor;
            const imgHeight = img.height * img.scaleFactor;
            
            if (
                x >= img.x && 
                x <= img.x + imgWidth && 
                y >= img.y && 
                y <= img.y + imgHeight
            ) {
                isDragging = true;
                selectedImageIndex = i;
                dragStartX = x;
                dragStartY = y;
                initialX = img.x;
                initialY = img.y;
                
                // Move selected image to top
                const selectedImage = images[i];
                images.splice(i, 1);
                images.push(selectedImage);
                selectedImageIndex = images.length - 1;
                
                updateControls();
                updateUI();
                break;
            }
        }
    }
    
    function handleMouseMove(e) {
        if (!isDragging && !isResizing) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const dx = x - dragStartX;
        const dy = y - dragStartY;
        
        if (isDragging) {
            if (selectedImageIndex !== -1) {
                const selectedImage = images[selectedImageIndex];
                selectedImage.x = initialX + dx;
                selectedImage.y = initialY + dy;
            } else if (selectedTextIndex !== -1) {
                const selectedText = texts[selectedTextIndex];
                selectedText.x = initialX + dx;
                selectedText.y = initialY + dy;
            }
        } else if (isResizing && selectedImageIndex !== -1) {
            // Handle image resizing based on the resize direction
            const img = images[selectedImageIndex];
            const aspectRatio = img.width / img.height;
            
            let newWidth, newHeight, newX, newY;
            
            switch (resizeDirection) {
                case 'se':
                    newWidth = Math.max(50, initialWidth + dx);
                    newHeight = newWidth / aspectRatio;
                    newX = initialX;
                    newY = initialY;
                    break;
                case 'sw':
                    newWidth = Math.max(50, initialWidth - dx);
                    newHeight = newWidth / aspectRatio;
                    newX = initialX + initialWidth - newWidth;
                    newY = initialY;
                    break;
                case 'ne':
                    newWidth = Math.max(50, initialWidth + dx);
                    newHeight = newWidth / aspectRatio;
                    newX = initialX;
                    newY = initialY + initialHeight - newHeight;
                    break;
                case 'nw':
                    newWidth = Math.max(50, initialWidth - dx);
                    newHeight = newWidth / aspectRatio;
                    newX = initialX + initialWidth - newWidth;
                    newY = initialY + initialHeight - newHeight;
                    break;
            }
            
            img.scaleFactor = newWidth / img.width;
            img.x = newX;
            img.y = newY;
            
            // Update the scale slider
            const scalePercent = Math.round(img.scaleFactor * 100);
            imageScale.value = scalePercent;
            imageScaleValue.textContent = `${scalePercent}%`;
        }
        
        updateUI();
    }
    
    function handleMouseUp(e) {
        if (isDragging || isResizing) {
            isDragging = false;
            isResizing = false;
            saveState();
            updateUI();
        }
    }
    
    function handleUndo() {
        if (currentHistoryIndex > 0) {
            currentHistoryIndex--;
            restoreState(historyStates[currentHistoryIndex]);
            updateUI();
            updateControls();
            updateButtonState();
        }
    }
    
    function handleRedo() {
        if (currentHistoryIndex < historyStates.length - 1) {
            currentHistoryIndex++;
            restoreState(historyStates[currentHistoryIndex]);
            updateUI();
            updateControls();
            updateButtonState();
        }
    }
    
    function saveState() {
        // Truncate forward history if we're not at the end
        if (currentHistoryIndex < historyStates.length - 1) {
            historyStates = historyStates.slice(0, currentHistoryIndex + 1);
        }
        
        // Create a deep copy of the images and texts arrays
        const imagesDeepCopy = JSON.parse(JSON.stringify(images));
        const textsDeepCopy = JSON.parse(JSON.stringify(texts));
        
        // Add the state to history
        historyStates.push({
            images: imagesDeepCopy,
            texts: textsDeepCopy
        });
        currentHistoryIndex = historyStates.length - 1;
        
        updateButtonState();
    }
    
    function restoreState(state) {
        images = JSON.parse(JSON.stringify(state.images || []));
        texts = JSON.parse(JSON.stringify(state.texts || []));
    }
    
    function updateButtonState() {
        undoBtn.disabled = currentHistoryIndex <= 0;
        redoBtn.disabled = currentHistoryIndex >= historyStates.length - 1;
        exportBtn.disabled = images.length === 0;
    }
    
    function updateUI() {
        // Clear canvas (except drop zone)
        const dropZone = canvas.querySelector('.drop-zone');
        const imageElements = document.querySelectorAll('.image-item');
        imageElements.forEach(el => el.remove());
        
        // Remove all text elements
        const textElements = document.querySelectorAll('.meme-text');
        textElements.forEach(el => el.remove());
        
        // Remove all resize handles
        const resizeHandles = document.querySelectorAll('.resize-handle');
        resizeHandles.forEach(el => el.remove());
        
        // Show/hide drop zone
        if (dropZone) {
            dropZone.style.display = images.length > 0 ? 'none' : 'flex';
        }
        
        // Add images
        images.forEach((img, index) => {
            const imgElement = document.createElement('img');
            imgElement.src = img.src;
            imgElement.classList.add('image-item');
            if (index === selectedImageIndex) {
                imgElement.classList.add('selected');
            }
            
            imgElement.style.width = `${img.width * img.scaleFactor}px`;
            imgElement.style.height = `${img.height * img.scaleFactor}px`;
            imgElement.style.left = `${img.x}px`;
            imgElement.style.top = `${img.y}px`;
            
            canvas.appendChild(imgElement);
            
            // Add resize handles for selected image
            if (index === selectedImageIndex) {
                const directions = ['nw', 'ne', 'sw', 'se'];
                directions.forEach(dir => {
                    const handle = document.createElement('div');
                    handle.classList.add('resize-handle', dir);
                    imgElement.appendChild(handle);
                });
            }
        });
        
        // Add text elements
        texts.forEach((text, index) => {
            const textElement = document.createElement('div');
            textElement.id = `text-${index}`;
            textElement.classList.add('meme-text');
            if (index === selectedTextIndex) {
                textElement.classList.add('selected');
            }
            
            textElement.textContent = text.content;
            textElement.style.left = `${text.x}px`;
            textElement.style.top = `${text.y}px`;
            textElement.style.fontSize = `${text.fontSize}px`;
            textElement.style.color = text.color;
            
            canvas.appendChild(textElement);
        });
        
        updateButtonState();
    }
    
    // Text functions
    function addNewText() {
        const canvasWidth = canvas.clientWidth;
        const canvasHeight = canvas.clientHeight;
        
        texts.push({
            content: 'YOUR TEXT HERE',
            x: canvasWidth / 2 - 150,
            y: canvasHeight / 2 - 20,
            fontSize: 36,
            color: '#ffffff'
        });
        
        selectedTextIndex = texts.length - 1;
        saveState();
        updateUI();
        updateControls();
    }
    
    function updateControls() {
        // Hide both control panels by default
        textControls.style.display = 'none';
        imageControls.style.display = 'none';
        
        // Update text controls
        if (selectedTextIndex !== -1) {
            const text = texts[selectedTextIndex];
            textControls.style.display = 'block';
            textInput.value = text.content;
            textSize.value = text.fontSize;
            textSizeValue.textContent = `${text.fontSize}px`;
            textColor.value = text.color;
        }
        
        // Update image controls
        if (selectedImageIndex !== -1) {
            const img = images[selectedImageIndex];
            imageControls.style.display = 'block';
            const scalePercent = Math.round(img.scaleFactor * 100);
            imageScale.value = scalePercent;
            imageScaleValue.textContent = `${scalePercent}%`;
        }
    }
    
    function updateSelectedText() {
        if (selectedTextIndex !== -1) {
            texts[selectedTextIndex].content = textInput.value;
            updateUI();
        }
    }
    
    function updateTextSize() {
        if (selectedTextIndex !== -1) {
            textSizeValue.textContent = `${textSize.value}px`;
            texts[selectedTextIndex].fontSize = parseInt(textSize.value);
            updateUI();
        }
    }
    
    function updateTextColor() {
        if (selectedTextIndex !== -1) {
            texts[selectedTextIndex].color = textColor.value;
            updateUI();
        }
    }
    
    function updateImageScale() {
        if (selectedImageIndex !== -1) {
            const scalePercent = parseInt(imageScale.value);
            imageScaleValue.textContent = `${scalePercent}%`;
            
            const img = images[selectedImageIndex];
            const oldWidth = img.width * img.scaleFactor;
            const oldHeight = img.height * img.scaleFactor;
            
            img.scaleFactor = scalePercent / 100;
            
            // Adjust position to scale from center
            const newWidth = img.width * img.scaleFactor;
            const newHeight = img.height * img.scaleFactor;
            img.x += (oldWidth - newWidth) / 2;
            img.y += (oldHeight - newHeight) / 2;
            
            updateUI();
        }
    }
    
    function positionText(position) {
        if (selectedTextIndex === -1) return;
        
        const canvasWidth = canvas.clientWidth;
        const canvasHeight = canvas.clientHeight;
        
        const text = texts[selectedTextIndex];
        const textElement = document.getElementById(`text-${selectedTextIndex}`);
        const textWidth = textElement ? textElement.offsetWidth : 300;
        
        // Center horizontally
        text.x = (canvasWidth - textWidth) / 2;
        
        // Position vertically
        switch (position) {
            case 'top':
                text.y = 20;
                break;
            case 'bottom':
                text.y = canvasHeight - textElement.offsetHeight - 20;
                break;
        }
        
        updateUI();
        saveState();
    }
    
    function deleteSelectedText() {
        if (selectedTextIndex !== -1) {
            texts.splice(selectedTextIndex, 1);
            selectedTextIndex = -1;
            saveState();
            updateUI();
            updateControls();
        }
    }
    
    function deleteSelectedImage() {
        if (selectedImageIndex !== -1) {
            images.splice(selectedImageIndex, 1);
            selectedImageIndex = -1;
            saveState();
            updateUI();
            updateControls();
            
            // Show drop zone if no images left
            if (images.length === 0) {
                showDropZone();
            }
        }
    }
    
    function bringSelectedImageToFront() {
        if (selectedImageIndex !== -1) {
            const selectedImage = images[selectedImageIndex];
            images.splice(selectedImageIndex, 1);
            images.push(selectedImage);
            selectedImageIndex = images.length - 1;
            updateUI();
            saveState();
        }
    }
    
    function sendSelectedImageToBack() {
        if (selectedImageIndex !== -1) {
            const selectedImage = images[selectedImageIndex];
            images.splice(selectedImageIndex, 1);
            images.unshift(selectedImage);
            selectedImageIndex = 0;
            updateUI();
            saveState();
        }
    }
    
    function exportAsPNG() {
        // Show loading indicator
        showLoading("Generating image...");
        
        // Temporarily hide any UI elements we don't want in the export
        document.querySelectorAll('.image-item').forEach(img => {
            img.classList.remove('selected');
        });
        
        document.querySelectorAll('.meme-text').forEach(text => {
            text.classList.remove('selected');
        });
        
        // Hide resize handles
        document.querySelectorAll('.resize-handle').forEach(handle => {
            handle.style.display = 'none';
        });
        
        const dropZone = canvas.querySelector('.drop-zone');
        if (dropZone) {
            dropZone.style.display = 'none';
        }
        
        // Save the original border style and temporarily remove it
        const originalBorder = canvas.style.border;
        canvas.style.border = 'none';
        
        // Use html2canvas to create an image from our canvas
        html2canvas(canvas, {
            backgroundColor: 'white',
            scale: 2, // For better quality
            logging: false,
            removeContainer: true,
        }).then(function(renderedCanvas) {
            // Create a link to download the image
            const link = document.createElement('a');
            link.download = 'meme.png';
            link.href = renderedCanvas.toDataURL('image/png');
            link.click();
            
            // Restore original border style
            canvas.style.border = originalBorder;
            
            // Restore UI elements
            if (dropZone && images.length === 0) {
                dropZone.style.display = 'flex';
            }
            
            // Show resize handles again
            document.querySelectorAll('.resize-handle').forEach(handle => {
                handle.style.display = 'block';
            });
            
            // Restore selected state
            updateUI();
            
            // Hide loading indicator
            hideLoading();
        }).catch(error => {
            console.error("Error exporting image:", error);
            hideLoading();
            alert("Error exporting image. Please try again.");
        });
    }
    
    // Helper functions for UI
    function showLoading(message = "Loading...") {
        // Create loading overlay if it doesn't exist
        let loading = document.querySelector('.loading');
        if (!loading) {
            loading = document.createElement('div');
            loading.className = 'loading';
            
            const loadingContent = document.createElement('div');
            loadingContent.className = 'loading-content';
            
            const spinner = document.createElement('div');
            spinner.className = 'spinner';
            
            const messageElement = document.createElement('div');
            messageElement.id = 'loading-message';
            messageElement.textContent = message;
            
            loadingContent.appendChild(spinner);
            loadingContent.appendChild(messageElement);
            loading.appendChild(loadingContent);
            
            document.body.appendChild(loading);
        } else {
            document.getElementById('loading-message').textContent = message;
            loading.style.display = 'flex';
        }
    }
    
    function hideLoading() {
        const loading = document.querySelector('.loading');
        if (loading) {
            loading.style.display = 'none';
        }
    }
    
    // New functions for the added features
    
    // Reset the canvas to its initial state
    function resetCanvas() {
        // Confirm before resetting
        if (images.length > 0 || texts.length > 0) {
            if (!confirm('This will clear all images and text. Are you sure?')) {
                return;
            }
        }
        
        // Clear images and texts
        images = [];
        texts = [];
        
        // Reset selection
        selectedImageIndex = -1;
        selectedTextIndex = -1;
        
        // Save state and update UI
        saveState();
        updateUI();
        updateControls();
        showDropZone();
    }
    
    // Toggle dark mode
    function toggleDarkMode() {
        isDarkMode = !isDarkMode;
        
        // Toggle dark mode class on body
        document.body.classList.toggle('light-mode', !isDarkMode);
        document.body.classList.toggle('dark-mode', isDarkMode);
        
        // Update icon
        if (isDarkMode) {
            darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            darkModeToggle.title = "Switch to Light Mode";
        } else {
            darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            darkModeToggle.title = "Switch to Dark Mode";
        }
    }
    
    // Update the dark mode toggle icon initially
    darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    darkModeToggle.title = "Switch to Light Mode";
    
    // Update canvas aspect ratio based on selection
    function updateCanvasAspectRatio(ratio) {
        let width, height;
        
        switch (ratio) {
            case '16:9':
                width = 16;
                height = 9;
                break;
            case '4:3':
                width = 4;
                height = 3;
                break;
            case '9:16':
                width = 9;
                height = 16;
                break;
            default: // 1:1 square
                width = 1;
                height = 1;
                break;
        }
        
        currentAspectRatio = { width, height };
        updateCanvasSize();
        
        // Update image and text positions to fit new canvas size
        if (images.length > 0 || texts.length > 0) {
            arrangeImagesOptimally();
        }
    }
    
    function updateCanvasSize() {
        const ratio = currentAspectRatio.width / currentAspectRatio.height;
        const { maxWidth, maxHeight } = getOptimalCanvasSize();
        
        // Canvas dimensions element
        const canvasDimensions = document.getElementById('canvas-dimensions');
        
        if (ratio >= 1) {
            // Landscape or square
            const width = Math.min(maxWidth, 800);
            const height = Math.round(width / ratio);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            canvasDimensions.textContent = `${width} x ${height}`;
        } else {
            // Portrait
            const height = Math.min(maxHeight, 800);
            const width = Math.round(height * ratio);
            canvas.style.height = `${height}px`;
            canvas.style.width = `${width}px`;
            canvasDimensions.textContent = `${width} x ${height}`;
        }
        
        // For mobile devices with touch events, add additional optimizations
        if ('ontouchstart' in window) {
            // Make text slightly larger for better mobile readability
            texts.forEach(text => {
                if (text.fontSize < 28) {
                    text.fontSize = 28;
                }
            });
            
            // Make resize handles larger for touch targets
            const resizeHandles = document.querySelectorAll('.resize-handle');
            resizeHandles.forEach(handle => {
                handle.style.width = '24px';
                handle.style.height = '24px';
            });
        }
    }
    
    // Optimal arrangement of images
    function arrangeImagesOptimally() {
        if (images.length === 0) return;
        
        const canvasWidth = canvas.clientWidth;
        const canvasHeight = canvas.clientHeight;
        
        // Use a dynamic padding that scales with the number of images
        // Fewer images = more padding, more images = less padding (min 5px)
        const basePadding = 15;
        const minPadding = 5;
        const padding = Math.max(basePadding - (images.length / 2), minPadding);
        
        // Create a working copy of images for manipulation
        let workingImages = [...images];
        
        // Shuffle the images first to create different layouts each time
        workingImages = shuffleArray(workingImages);
        
        // Sort images by area (larger images first)
        workingImages.sort((a, b) => (b.width * b.height) - (a.width * a.height));
        
        // Calculate total image area and canvas area
        let totalImageArea = 0;
        workingImages.forEach(img => {
            totalImageArea += img.width * img.height;
        });
        
        const canvasArea = canvasWidth * canvasHeight;
        
        // Calculate average image area - this is our target for equal sizing
        const avgImageArea = totalImageArea / workingImages.length;
        
        // Target scale factor to make images closer to equal visual size
        // Increase utilization to 90% of canvas for better space usage
        const targetScale = Math.sqrt((canvasArea * 0.9) / totalImageArea);
        
        // Calculate ideal display area per image (in pixels)
        const idealArea = (canvasArea * 0.9) / workingImages.length;
        const idealSideLength = Math.sqrt(idealArea);
        
        // Assign importance to each image
        workingImages.forEach((img, index) => {
            // Original importance calculation
            const sizeFactor = (img.width * img.height) / (totalImageArea / workingImages.length);
            const positionFactor = 1 - (index / workingImages.length);
            
            // Equal sizing gets higher weighting now (0.7 vs 0.3 for traditional factors)
            img.importance = (sizeFactor * 0.15) + (positionFactor * 0.15) + 0.7;
            
            // Store the ideal scale factor for this image to achieve the ideal area
            img.idealScaleFactor = Math.sqrt(idealArea / (img.width * img.height));
        });
        
        // Initialize layout with improved treemap algorithm
        const result = divideSpaceAndPlace(
            workingImages, 
            padding, 
            padding, 
            canvasWidth - padding * 2, 
            canvasHeight - padding * 2,
            targetScale,
            idealSideLength
        );
        
        // Apply positions from our layout algorithm
        result.forEach((layout, index) => {
            const img = workingImages[index];
            img.x = layout.x;
            img.y = layout.y;
            img.scaleFactor = layout.scaleFactor;
        });
        
        // Perform collision detection and resolution
        resolveCollisions(workingImages);
        
        // Apply the working image changes to the actual images array
        // We need to map working images back to their original positions
        workingImages.forEach((workingImg) => {
            // Find the original image that matches this working image
            const originalImg = images.find(img => 
                img.src === workingImg.src && 
                img.width === workingImg.width && 
                img.height === workingImg.height
            );
            
            if (originalImg) {
                originalImg.x = workingImg.x;
                originalImg.y = workingImg.y;
                originalImg.scaleFactor = workingImg.scaleFactor;
            }
        });
        
        // Also reposition text elements if they exist
        if (texts.length > 0) {
            const canvasWidth = canvas.clientWidth;
            const canvasHeight = canvas.clientHeight;
            
            texts.forEach(text => {
                // If text is at top, keep it at top
                if (text.y < canvasHeight * 0.25) {
                    text.y = 20;
                    text.x = (canvasWidth - 300) / 2; // Approximate width
                } 
                // If text is at bottom, keep it at bottom
                else if (text.y > canvasHeight * 0.75) {
                    text.y = canvasHeight - 70;
                    text.x = (canvasWidth - 300) / 2; // Approximate width
                }
                // Otherwise, try to keep it centered
                else {
                    text.y = (canvasHeight - 36) / 2; // Approximate font size
                    text.x = (canvasWidth - 300) / 2; // Approximate width
                }
            });
        }
        
        saveState();
        updateUI();
        
        // Recursive function to divide space and place images with improved collision avoidance
        function divideSpaceAndPlace(imagesToPlace, x, y, width, height, baseScale, idealSize) {
            // Base case: if we have only one image, it gets the entire space
            if (imagesToPlace.length === 1) {
                const img = imagesToPlace[0];
                const imgAspect = img.width / img.height;
                
                // Calculate the largest size that fits in the available space
                let scaleFactor;
                if (imgAspect > width / height) {
                    // Width constrained
                    scaleFactor = (width - padding * 2) / img.width;
                } else {
                    // Height constrained
                    scaleFactor = (height - padding * 2) / img.height;
                }
                
                // Balance between fitting the space and achieving ideal size
                // Target more equal sizing (now weighted at 70%)
                const sizeEqualityFactor = 0.7;
                const spatialFitFactor = 0.3;
                
                // Calculate a scale factor that targets the ideal size
                const idealScaleFactor = img.idealScaleFactor || baseScale;
                
                // Blend between the max fit scale and ideal scale based on our weighting
                const blendedScale = (scaleFactor * spatialFitFactor) + (idealScaleFactor * sizeEqualityFactor);
                
                // Ensure minimum scale factor (0.7 of base for better visibility)
                const finalScale = Math.max(blendedScale, baseScale * 0.7);
                
                // Center the image in available space
                const scaledWidth = img.width * finalScale;
                const scaledHeight = img.height * finalScale;
                const centerX = x + (width - scaledWidth) / 2;
                const centerY = y + (height - scaledHeight) / 2;
                
                return [{
                    x: centerX,
                    y: centerY,
                    width: scaledWidth,
                    height: scaledHeight,
                    scaleFactor: finalScale
                }];
            }
            
            // Divide images into two groups by total area
            const midpoint = findBalancedSplit(imagesToPlace, idealSize);
            const group1 = imagesToPlace.slice(0, midpoint);
            const group2 = imagesToPlace.slice(midpoint);
            
            // Calculate total area of each group
            let area1 = 0, area2 = 0;
            group1.forEach(img => area1 += img.width * img.height);
            group2.forEach(img => area2 += img.width * img.height);
            
            // Improved space division ratio calculation
            // Blend count-based and area-based ratios (favoring count for more equality)
            const countRatio = group1.length / imagesToPlace.length;
            const areaRatio = area1 / (area1 + area2);
            
            // Balance between count and area (80% count, 20% area) for more consistent sizing
            const ratio = (countRatio * 0.8) + (areaRatio * 0.2);
            
            // Decide whether to split horizontally or vertically
            let group1Results, group2Results;
            
            // Calculate weighted average aspect ratios for each group
            let group1AspectRatio = 0;
            let group2AspectRatio = 0;
            
            group1.forEach(img => {
                const weight = (img.width * img.height) / area1;
                group1AspectRatio += (img.width / img.height) * weight;
            });
            
            group2.forEach(img => {
                const weight = (img.width * img.height) / area2;
                group2AspectRatio += (img.width / img.height) * weight;
            });
            
            // Determine split direction with improved heuristic
            // Taking into account:
            // 1. How well aspect ratios fit into the proposed spaces
            // 2. Minimizing wasted space
            // 3. The container shape
            const containerAspect = width / height;
            
            // Calculate scores for both directions with improved weights for better fitting
            const horizontalFit = Math.abs(group1AspectRatio - (width * ratio) / height) + 
                                Math.abs(group2AspectRatio - (width * (1-ratio)) / height);
            
            const verticalFit = Math.abs(group1AspectRatio - width / (height * ratio)) + 
                              Math.abs(group2AspectRatio - width / (height * (1-ratio)));
            
            // Add a bias based on container shape to avoid thin slices
            const horizontalScore = horizontalFit * (containerAspect < 1 ? 1.1 : 0.9);
            const verticalScore = verticalFit * (containerAspect > 1 ? 1.1 : 0.9);
            
            // Ensure the padding is consistent and proportional to the space
            const effectivePadding = Math.min(padding, Math.min(width, height) * 0.05);
            
            if (horizontalScore <= verticalScore) {
                // Calculate split point with proper padding consideration
                const effectiveWidth = width - effectivePadding; // Account for padding space
                const splitX = x + Math.floor(effectiveWidth * ratio);
                
                // Ensure enough space on both sides (at least 2x padding)
                const adjustedSplitX = Math.min(
                    Math.max(splitX, x + padding * 2),
                    x + width - padding * 2
                );
                
                group1Results = divideSpaceAndPlace(
                    group1, 
                    x, 
                    y, 
                    adjustedSplitX - x - effectivePadding/2, 
                    height, 
                    baseScale, 
                    idealSize
                );
                
                group2Results = divideSpaceAndPlace(
                    group2, 
                    adjustedSplitX + effectivePadding/2, 
                    y, 
                    x + width - adjustedSplitX - effectivePadding/2, 
                    height, 
                    baseScale, 
                    idealSize
                );
            } else {
                // Calculate split point with proper padding consideration
                const effectiveHeight = height - effectivePadding; // Account for padding space
                const splitY = y + Math.floor(effectiveHeight * ratio);
                
                // Ensure enough space on both sides (at least 2x padding)
                const adjustedSplitY = Math.min(
                    Math.max(splitY, y + padding * 2),
                    y + height - padding * 2
                );
                
                group1Results = divideSpaceAndPlace(
                    group1, 
                    x, 
                    y, 
                    width, 
                    adjustedSplitY - y - effectivePadding/2, 
                    baseScale, 
                    idealSize
                );
                
                group2Results = divideSpaceAndPlace(
                    group2, 
                    x, 
                    adjustedSplitY + effectivePadding/2, 
                    width, 
                    y + height - adjustedSplitY - effectivePadding/2, 
                    baseScale, 
                    idealSize
                );
            }
            
            return [...group1Results, ...group2Results];
        }
        
        // Helper function to find the balanced split point - refined for better balance
        function findBalancedSplit(items, idealSize) {
            if (items.length <= 1) return 1;
            
            // For very small sets, just divide in half
            if (items.length <= 3) return Math.ceil(items.length / 2);
            
            // Calculate total area and aspect information
            let totalArea = 0;
            let totalAspectWeight = 0;
            
            items.forEach(img => {
                const area = img.width * img.height;
                totalArea += area;
                totalAspectWeight += (img.width / img.height) * area;
            });
            
            const halfArea = totalArea / 2;
            const targetAspect = totalAspectWeight / totalArea;
            const halfCount = items.length / 2;
            
            // Find split point that balances area, count, and aspect ratios
            let bestSplitIndex = 1;
            let bestScore = Infinity;
            let currentArea = 0;
            let currentAspectWeight = 0;
            
            for (let i = 0; i < items.length - 1; i++) {
                const img = items[i];
                const imgArea = img.width * img.height;
                
                currentArea += imgArea;
                currentAspectWeight += (img.width / img.height) * imgArea;
                
                // Score based on how well this split balances area
                const areaScore = Math.abs(currentArea - halfArea) / totalArea;
                
                // Get aspect ratio for each group
                const group1Aspect = currentAspectWeight / currentArea;
                const group2Aspect = (totalAspectWeight - currentAspectWeight) / (totalArea - currentArea);
                
                // Score based on how well aspects in each group match the target
                const aspectScore = Math.abs(group1Aspect - targetAspect) + Math.abs(group2Aspect - targetAspect);
                
                // Score based on how evenly this splits the count (important for equal sizing)
                const countScore = Math.abs((i + 1) - halfCount) / items.length;
                
                // Combined score (lower is better) with count having the highest weight for equal sizing
                // Increased weighting for count to 70% to prioritize equal number of images in each group
                const score = (areaScore * 0.15) + (aspectScore * 0.15) + (countScore * 0.7);
                
                if (score < bestScore) {
                    bestScore = score;
                    bestSplitIndex = i + 1;
                }
            }
            
            return bestSplitIndex;
        }
        
        // New function to detect and resolve collisions between images
        function resolveCollisions(imageArray) {
            const collisionPadding = padding / 2; // Minimum space between images
            let collisionsResolved = false;
            let iterations = 0;
            const maxIterations = 5; // Limit iterations to prevent infinite loops
            
            // Loop until no more collisions are found or max iterations reached
            while (!collisionsResolved && iterations < maxIterations) {
                collisionsResolved = true;
                iterations++;
                
                // Check each pair of images for collisions
                for (let i = 0; i < imageArray.length; i++) {
                    const img1 = imageArray[i];
                    const rect1 = {
                        left: img1.x,
                        top: img1.y,
                        right: img1.x + (img1.width * img1.scaleFactor),
                        bottom: img1.y + (img1.height * img1.scaleFactor)
                    };
                    
                    for (let j = i + 1; j < imageArray.length; j++) {
                        const img2 = imageArray[j];
                        const rect2 = {
                            left: img2.x,
                            top: img2.y,
                            right: img2.x + (img2.width * img2.scaleFactor),
                            bottom: img2.y + (img2.height * img2.scaleFactor)
                        };
                        
                        // Check if rectangles overlap
                        if (rect1.left < rect2.right + collisionPadding && 
                            rect1.right + collisionPadding > rect2.left && 
                            rect1.top < rect2.bottom + collisionPadding && 
                            rect1.bottom + collisionPadding > rect2.top) {
                            
                            collisionsResolved = false;
                            
                            // Calculate overlap in each direction
                            const overlapLeft = rect2.right + collisionPadding - rect1.left;
                            const overlapRight = rect1.right + collisionPadding - rect2.left;
                            const overlapTop = rect2.bottom + collisionPadding - rect1.top;
                            const overlapBottom = rect1.bottom + collisionPadding - rect2.top;
                            
                            // Find the smallest overlap
                            const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
                            
                            // Apply a small adjustment factor to avoid images touching directly
                            const adjustFactor = 1.1;
                            
                            // Move the images apart in the direction of least overlap
                            if (minOverlap === overlapLeft) {
                                img1.x += overlapLeft * adjustFactor;
                            } else if (minOverlap === overlapRight) {
                                img1.x -= overlapRight * adjustFactor;
                            } else if (minOverlap === overlapTop) {
                                img1.y += overlapTop * adjustFactor;
                            } else {
                                img1.y -= overlapBottom * adjustFactor;
                            }
                            
                            // Ensure the image stays within canvas bounds
                            img1.x = Math.max(padding, Math.min(img1.x, canvasWidth - (img1.width * img1.scaleFactor) - padding));
                            img1.y = Math.max(padding, Math.min(img1.y, canvasHeight - (img1.height * img1.scaleFactor) - padding));
                        }
                    }
                }
            }
            
            // If we've hit max iterations but still have collisions, try reducing image sizes
            if (!collisionsResolved) {
                // Reduce all image sizes slightly to create more space
                imageArray.forEach(img => {
                    img.scaleFactor *= 0.95; // Reduce size by 5%
                });
                
                // Try to center images in their relative positions
                centerImages(imageArray);
            }
        }
        
        // Helper function to center all images in the canvas
        function centerImages(imageArray) {
            // Find the bounds of all images
            let minX = canvasWidth, minY = canvasHeight;
            let maxX = 0, maxY = 0;
            
            imageArray.forEach(img => {
                minX = Math.min(minX, img.x);
                minY = Math.min(minY, img.y);
                maxX = Math.max(maxX, img.x + (img.width * img.scaleFactor));
                maxY = Math.max(maxY, img.y + (img.height * img.scaleFactor));
            });
            
            // Calculate the current group width and height
            const groupWidth = maxX - minX;
            const groupHeight = maxY - minY;
            
            // Calculate the offset to center the group
            const offsetX = (canvasWidth - groupWidth) / 2 - minX;
            const offsetY = (canvasHeight - groupHeight) / 2 - minY;
            
            // Apply offset to all images
            imageArray.forEach(img => {
                img.x += offsetX;
                img.y += offsetY;
            });
        }
    }
    
    // Helper function to shuffle an array
    function shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }
});
