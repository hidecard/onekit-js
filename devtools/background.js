// OneKit DevTools Background Script
// Handles communication between content scripts and DevTools panels

class OneKitDevToolsBackground {
  constructor() {
    this.connections = new Map();
    this.init();
  }

  init() {
    // Listen for connections from DevTools panels
    chrome.runtime.onConnect.addListener((port) => {
      if (port.name === 'onekit-devtools') {
        this.handleDevToolsConnection(port);
      }
    });

    // Listen for messages from content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleContentScriptMessage(message, sender, sendResponse);
      return true; // Keep message channel open
    });
  }

  handleDevToolsConnection(port) {
    const tabId = port.sender.tab.id;
    this.connections.set(tabId, port);

    console.log(`[OneKit DevTools] DevTools panel connected for tab ${tabId}`);

    // Handle messages from DevTools panel
    port.onMessage.addListener((message) => {
      this.handleDevToolsMessage(message, tabId);
    });

    // Clean up when DevTools panel disconnects
    port.onDisconnect.addListener(() => {
      this.connections.delete(tabId);
      console.log(`[OneKit DevTools] DevTools panel disconnected for tab ${tabId}`);
    });

    // Send initial data if available
    this.sendToContentScript(tabId, { action: 'getData' });
  }

  handleDevToolsMessage(message, tabId) {
    // Forward messages to content script
    this.sendToContentScript(tabId, message);
  }

  handleContentScriptMessage(message, sender, sendResponse) {
    const tabId = sender.tab.id;

    if (message.action === 'bridgeMessage') {
      // Forward bridge messages to DevTools panel
      const port = this.connections.get(tabId);
      if (port) {
        port.postMessage(message);
      }
    } else if (message.action === 'getData') {
      // Content script is responding with data
      const port = this.connections.get(tabId);
      if (port) {
        port.postMessage({
          type: 'initialData',
          data: message.data || {}
        });
      }
    }
  }

  sendToContentScript(tabId, message) {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('[OneKit DevTools] Error sending message to content script:', chrome.runtime.lastError);
      }
    });
  }

  // Utility method to get active tab
  getActiveTab(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        callback(tabs[0]);
      }
    });
  }
}

// Initialize background script
new OneKitDevToolsBackground();
