// Store console messages
window.storedConsoleMessages = [];

// Store original console methods
const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error
};

// Override console methods to capture messages
['log', 'info', 'warn', 'error'].forEach(type => {
    console[type] = function(...args) {
        // Call original method
        originalConsole[type].apply(console, args);
        
        // Store the message
        window.storedConsoleMessages.push({
            type: type,
            text: args.map(arg => {
                try {
                    return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
                } catch (e) {
                    return String(arg);
                }
            }).join(' '),
            timestamp: new Date().toISOString()
        });
    };
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getConsoleMessages') {
        sendResponse({ messages: window.storedConsoleMessages });
    }
    return true;
});

// Capture existing errors
window.onerror = function(msg, url, lineNo, columnNo, error) {
    window.storedConsoleMessages.push({
        type: 'error',
        text: `${msg} at ${url}:${lineNo}:${columnNo}`,
        timestamp: new Date().toISOString()
    });
    return false;
};

// Capture unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
    window.storedConsoleMessages.push({
        type: 'error',
        text: `Unhandled Promise Rejection: ${event.reason}`,
        timestamp: new Date().toISOString()
    });
});