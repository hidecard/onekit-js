// OneKit DevTools Content Script
// Handles communication between the page and DevTools panel

(function() {
  'use strict';

  class OneKitContentScript {
    constructor() {
      this.bridgeInjected = false;
      this.init();
    }

    init() {
      // Listen for messages from DevTools panel
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        this.handleDevToolsMessage(message, sendResponse);
        return true;
      });

      // Listen for messages from page bridge
      window.addEventListener('message', (event) => {
        if (event.source === window && event.data.source === 'onekit-devtools-bridge') {
          this.handleBridgeMessage(event.data);
        }
      });

      // Inject bridge script
      this.injectBridge();

      // Check for OneKit periodically
      this.checkForOneKit();
    }

    injectBridge() {
      if (this.bridgeInjected) return;

      // Fetch bridge script content
      fetch(chrome.runtime.getURL('bridge.js'))
        .then(response => response.text())
        .then(script => {
          const scriptElement = document.createElement('script');
          scriptElement.textContent = script;
          (document.head || document.documentElement).appendChild(scriptElement);
          this.bridgeInjected = true;
        })
        .catch(error => {
          console.warn('[OneKit DevTools] Failed to inject bridge:', error);
        });
    }

    checkForOneKit() {
      // Check if OneKit is loaded
      const checkInterval = setInterval(() => {
        if (window.OneKit || window.onekit || window.__ONEKIT_DEVTOOLS__) {
          clearInterval(checkInterval);
          this.onOneKitDetected();
        }
      }, 1000);

      // Stop checking after 30 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
      }, 30000);
    }

    onOneKitDetected() {
      // Send message to DevTools that OneKit is ready
      chrome.runtime.sendMessage({
        action: 'onekitDetected',
        url: window.location.href
      });
    }

    handleDevToolsMessage(message, sendResponse) {
      switch (message.action) {
        case 'getData':
          // Request data from bridge
          this.sendToBridge({ action: 'getData' });
          break;

        case 'refresh':
          // Refresh specific tab data
          this.sendToBridge({ action: 'refresh', tab: message.tab });
          break;

        case 'getComponentDetails':
          // Request component details
          this.sendToBridge({
            action: 'getComponentDetails',
            componentId: message.componentId
          });
          break;

        default:
          // Forward to bridge
          this.sendToBridge(message);
      }
    }

    handleBridgeMessage(message) {
      // Forward bridge messages to DevTools panel
      chrome.runtime.sendMessage({
        action: 'bridgeMessage',
        ...message
      });
    }

    sendToBridge(message) {
      if (window.__ONEKIT_DEVTOOLS__ && typeof window.__ONEKIT_DEVTOOLS__.sendToDevTools === 'function') {
        window.__ONEKIT_DEVTOOLS__.sendToDevTools(message);
      } else {
        // Bridge not ready, queue message
        if (!this.messageQueue) {
          this.messageQueue = [];
        }
        this.messageQueue.push(message);

        // Try to send queued messages when bridge becomes ready
        if (!this.bridgeReadyListener) {
          this.bridgeReadyListener = () => {
            if (window.__ONEKIT_DEVTOOLS__ && this.messageQueue) {
              this.messageQueue.forEach(msg => {
                window.__ONEKIT_DEVTOOLS__.sendToDevTools(msg);
              });
              this.messageQueue = [];
            }
          };

          // Check every 100ms for bridge readiness
          const checkBridge = setInterval(() => {
            if (window.__ONEKIT_DEVTOOLS__) {
              clearInterval(checkBridge);
              this.bridgeReadyListener();
            }
          }, 100);
        }
      }
    }
  }

  // Initialize content script
  new OneKitContentScript();

})();
