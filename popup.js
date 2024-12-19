let screenshotData = null;
// Add error handling
window.onerror = function(msg, url, lineNo, columnNo, error) {
    const statusElement = document.getElementById('status');
    if (statusElement) {
        statusElement.textContent = 'Error: ' + msg;
    }
    console.error('Error:', msg, 'at', url, 'line:', lineNo);
    return false;
    // small change for update test
};

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
    
    const capturePageBtn = document.getElementById('capturePageBtn');
    const captureConsoleBtn = document.getElementById('captureConsoleBtn');
    const sendBtn = document.getElementById('sendBtn');
    const statusElement = document.getElementById('status');
    
    if (!capturePageBtn || !captureConsoleBtn || !sendBtn) {
        console.error('Buttons not found!');
        statusElement.textContent = 'Error: UI elements not found';
        return;
    }
    
    capturePageBtn.addEventListener('click', () => captureScreenshot('page'));
    captureConsoleBtn.addEventListener('click', () => captureScreenshot('console'));
    sendBtn.addEventListener('click', sendToAPI);
    
    statusElement.textContent = 'Ready to capture';

    // Tab switching
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and contents
            document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });

    // Load saved settings
    loadSettings();

    // Settings form submission
    document.getElementById('settingsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveSettings();
    });

    // Add image preview functionality
    const preview = document.getElementById('preview');
    const imagePopup = document.getElementById('imagePopup');
    const popupImage = document.getElementById('popupImage');
    const closePopup = document.querySelector('.close-popup');

    // Open popup when clicking the preview image
    preview.addEventListener('click', () => {
        imagePopup.style.display = 'block';
        popupImage.src = preview.src;
    });

    // Close popup when clicking the close button
    closePopup.addEventListener('click', () => {
        imagePopup.style.display = 'none';
    });

    // Close popup when clicking outside the image
    imagePopup.addEventListener('click', (e) => {
        if (e.target === imagePopup) {
            imagePopup.style.display = 'none';
        }
    });

    // Close popup when pressing Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && imagePopup.style.display === 'block') {
            imagePopup.style.display = 'none';
        }
    });

    // Drawing functionality
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
    const colorPicker = document.getElementById('colorPicker');
    const undoBtn = document.getElementById('undoBtn');
    const clearBtn = document.getElementById('clearBtn');

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let drawingHistory = [];
    let currentLine = [];

    function initCanvas(imgSrc) {
        const img = new Image();
        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            // Clear history when loading new image
            drawingHistory = [];
        };
        img.src = imgSrc;
    }

    // Drawing event handlers
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    function startDrawing(e) {
        isDrawing = true;
        [lastX, lastY] = [e.offsetX, e.offsetY];
        currentLine = [];  // Start new line
    }

    function draw(e) {
        if (!isDrawing) return;

        const currentPoint = {
            x: e.offsetX,
            y: e.offsetY,
            color: colorPicker.value
        };

        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(currentPoint.x, currentPoint.y);
        ctx.strokeStyle = colorPicker.value;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();

        currentLine.push({
            startX: lastX,
            startY: lastY,
            endX: currentPoint.x,
            endY: currentPoint.y,
            color: colorPicker.value
        });

        [lastX, lastY] = [currentPoint.x, currentPoint.y];
    }

    function stopDrawing() {
        if (isDrawing && currentLine.length > 0) {
            drawingHistory.push(currentLine);
            currentLine = [];
        }
        isDrawing = false;
    }

    function redrawCanvas() {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Redraw original image
        const img = new Image();
        img.onload = function() {
            ctx.drawImage(img, 0, 0);
            
            // Redraw all lines
            drawingHistory.forEach(line => {
                line.forEach(point => {
                    ctx.beginPath();
                    ctx.moveTo(point.startX, point.startY);
                    ctx.lineTo(point.endX, point.endY);
                    ctx.strokeStyle = point.color;
                    ctx.lineWidth = 2;
                    ctx.lineCap = 'round';
                    ctx.stroke();
                });
            });
        };
        img.src = preview.src;
    }

    // Tool buttons
    undoBtn.addEventListener('click', () => {
        if (drawingHistory.length > 0) {
            drawingHistory.pop();  // Remove last line
            redrawCanvas();
        }
    });

    clearBtn.addEventListener('click', () => {
        drawingHistory = [];  // Clear history
        redrawCanvas();
    });

    // Modify the existing preview click handler
    preview.addEventListener('click', () => {
        imagePopup.style.display = 'block';
        initCanvas(preview.src);
    });

    // Save changes when closing popup
    closePopup.addEventListener('click', () => {
        screenshotData = canvas.toDataURL('image/png');
        preview.src = screenshotData;
        imagePopup.style.display = 'none';
    });

    // Add this near the top of your existing DOMContentLoaded listener
    const extensionToggle = document.getElementById('extensionToggle');
    const container = document.querySelector('.container');

    // Load saved state
    chrome.storage.sync.get(['extensionEnabled'], function(result) {
        const enabled = result.extensionEnabled !== false; // Default to enabled
        extensionToggle.checked = enabled;
        updateExtensionState(enabled);
    });

    // Handle toggle
    extensionToggle.addEventListener('change', function() {
        const enabled = this.checked;
        chrome.storage.sync.set({ extensionEnabled: enabled });
        updateExtensionState(enabled);
    });

    function updateExtensionState(enabled) {
        if (enabled) {
            container.classList.remove('disabled');
        } else {
            container.classList.add('disabled');
        }
    }
});

async function captureScreenshot(type) {
    const statusElement = document.getElementById('status');
    console.log(`Attempting to capture ${type} screenshot...`);
    
    try {
        // Get the current active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (type === 'console') {
            // Inject the content script first
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });

            // Get stored console messages
            const messages = await new Promise((resolve) => {
                chrome.tabs.sendMessage(tab.id, { action: 'getConsoleMessages' }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('Error getting messages:', chrome.runtime.lastError);
                        resolve([]);
                        return;
                    }
                    resolve(response?.messages || []);
                });
            });
            
            // Create overlay with messages
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: (messages) => {
                    const overlay = document.createElement('div');
                    overlay.id = 'console-overlay';
                    overlay.style.cssText = `
                        position: fixed;
                        top: 0;
                        right: 0;
                        width: 50%;
                        height: 100%;
                        background: #242424;
                        color: #fff;
                        font-family: monospace;
                        padding: 20px;
                        box-sizing: border-box;
                        z-index: 999999;
                        overflow: auto;
                    `;

                    // Add header
                    const header = document.createElement('div');
                    header.style.cssText = `
                        font-size: 14px;
                        font-weight: bold;
                        margin-bottom: 10px;
                        padding-bottom: 5px;
                        border-bottom: 1px solid #444;
                    `;
                    header.textContent = 'Console Output';
                    overlay.appendChild(header);

                    if (messages.length > 0) {
                        messages.forEach(msg => {
                            const line = document.createElement('div');
                            line.style.cssText = `
                                margin: 5px 0;
                                padding: 5px;
                                border-bottom: 1px solid #333;
                                white-space: pre-wrap;
                                font-size: 12px;
                            `;
                            
                            let prefix = '';
                            switch(msg.type) {
                                case 'error': prefix = '❌'; break;
                                case 'warn': prefix = '⚠️'; break;
                                case 'info': prefix = 'ℹ️'; break;
                                default: prefix = '📋';
                            }
                            
                            line.textContent = `${prefix} ${msg.type}: ${msg.text}`;
                            overlay.appendChild(line);
                        });
                    } else {
                        const line = document.createElement('div');
                        line.style.cssText = `
                            margin: 5px 0;
                            padding: 5px;
                            border-bottom: 1px solid #333;
                            white-space: pre-wrap;
                            font-size: 12px;
                            color: #888;
                        `;
                        line.textContent = 'No console messages found';
                        overlay.appendChild(line);
                    }

                    document.body.appendChild(overlay);
                },
                args: [messages]
            });

            // Wait for overlay to render
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Capture the visible area of the tab
        const screenshot = await chrome.tabs.captureVisibleTab(null, { 
            format: 'png',
            quality: 100
        });
        
        if (type === 'console') {
            // Clean up overlay and detach debugger
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: () => {
                    const overlay = document.getElementById('console-overlay');
                    if (overlay) overlay.remove();
                }
            });
            
            try {
                await chrome.debugger.detach({ tabId: tab.id });
            } catch (e) {
                console.error('Error detaching debugger:', e);
            }
        }
        
        // Show the screenshot preview
        const preview = document.getElementById('preview');
        preview.src = screenshot;
        screenshotData = screenshot;
        
        // Show the screenshot container
        const container = document.getElementById('screenshotContainer');
        container.style.display = 'block';
        statusElement.textContent = 'Screenshot captured!';
        
    } catch (err) {
        console.error('Failed to capture screenshot:', err);
        statusElement.textContent = 'Error: ' + err.message;
        
        // Clean up if there was an error
        try {
            await chrome.debugger.detach({ tabId: tab.id });
        } catch (e) {
            console.error('Error detaching debugger:', e);
        }
    }
}

async function loadSettings() {
    const settings = await chrome.storage.sync.get(['apiUrl', 'apiToken', 'username']);
    if (settings.apiUrl) document.getElementById('apiUrl').value = settings.apiUrl;
    if (settings.apiToken) document.getElementById('apiToken').value = settings.apiToken;
    if (settings.username) document.getElementById('username').value = settings.username;
}

async function saveSettings() {
    const settings = {
        apiUrl: document.getElementById('apiUrl').value,
        apiToken: document.getElementById('apiToken').value,
        username: document.getElementById('username').value
    };

    await chrome.storage.sync.set(settings);
    document.getElementById('status').textContent = 'Settings saved!';
    setTimeout(() => {
        document.getElementById('status').textContent = '';
    }, 2000);
}

async function sendToAPI() {
    const notes = document.getElementById('notes').value;
    const statusElement = document.getElementById('status');
    const loaderOverlay = document.querySelector('.loader-overlay');
    
    if (!screenshotData) {
        statusElement.textContent = 'No screenshot taken';
        return;
    }

    // Get settings
    const settings = await chrome.storage.sync.get(['apiUrl', 'apiToken', 'username']);
    if (!settings.apiUrl || !settings.apiToken || !settings.username) {
        statusElement.textContent = 'Please configure settings first';
        return;
    }

    // Show loader
    loaderOverlay.style.display = 'flex';
    statusElement.textContent = 'Sending to API...';

    try {
        // Get current tab URL
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentUrl = tab.url;

        // Get IP address
        let ipAddress;
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            ipAddress = data.ip;
        } catch (error) {
            console.error('Failed to get IP:', error);
            ipAddress = 'unknown';
        }

        // Get user agent
        const userAgent = navigator.userAgent;
        
        const response = await fetch(settings.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.apiToken}`
            },
            body: JSON.stringify({
                image: screenshotData,
                notes: notes,
                username: settings.username,
                ip: ipAddress,
                userAgent: userAgent,
                timestamp: new Date().toISOString(),
                url: currentUrl
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.msg || 'Network response was not ok');
        }

        // Display the API response message
        statusElement.textContent = data.msg || 'Successfully sent to API!';
        
        // Clear the form
        document.getElementById('notes').value = '';
        document.getElementById('preview').src = '';
        document.getElementById('screenshotContainer').style.display = 'none';
        screenshotData = null;
        
    } catch (error) {
        console.error('Error sending to API:', error);
        statusElement.textContent = error.message || 'Failed to send to API';
    } finally {
        // Hide loader
        loaderOverlay.style.display = 'none';
    }
}

//# sourceMappingURL=popup.js.map 