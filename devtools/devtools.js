// OneKit DevTools Panel
class OneKitDevTools {
  constructor() {
    this.currentTab = 'components';
    this.selectedComponent = null;
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.connectToContentScript();
    this.refreshData();
  }

  setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.sidebar li').forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchTab(tab.id.replace('-tab', ''));
      });
    });

    // Control buttons
    document.getElementById('refresh-btn').addEventListener('click', () => {
      this.refreshData();
    });

    document.getElementById('clear-btn').addEventListener('click', () => {
      this.clearData();
    });
  }

  switchTab(tabName) {
    // Update active tab
    document.querySelectorAll('.sidebar li').forEach(tab => {
      tab.classList.remove('active');
    });
    document.getElementById(tabName + '-tab').classList.add('active');

    // Update active panel
    document.querySelectorAll('.panel').forEach(panel => {
      panel.classList.remove('active');
    });
    document.getElementById(tabName + '-panel').classList.add('active');

    // Update title
    const titles = {
      components: 'Components',
      reactive: 'Reactive State',
      router: 'Router',
      network: 'Network',
      logs: 'Logs',
      performance: 'Performance'
    };
    document.getElementById('panel-title').textContent = titles[tabName];

    this.currentTab = tabName;
    this.refreshData();
  }

  connectToContentScript() {
    // Connect to content script via chrome.runtime
    if (chrome && chrome.runtime) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        this.handleMessage(message);
      });

      // Request initial data
      chrome.runtime.sendMessage({ action: 'getData' });
    }
  }

  handleMessage(message) {
    switch (message.type) {
      case 'componentTree':
        this.updateComponentTree(message.data);
        break;
      case 'reactiveState':
        this.updateReactiveState(message.data);
        break;
      case 'routerState':
        this.updateRouterState(message.data);
        break;
      case 'networkRequest':
        this.addNetworkRequest(message.data);
        break;
      case 'log':
        this.addLog(message.data);
        break;
      case 'performance':
        this.updatePerformance(message.data);
        break;
    }
  }

  refreshData() {
    if (chrome && chrome.runtime) {
      chrome.runtime.sendMessage({
        action: 'refresh',
        tab: this.currentTab
      });
    }
  }

  clearData() {
    switch (this.currentTab) {
      case 'network':
        document.getElementById('network-table-body').innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; padding: 40px; color: #666;">
              No network requests detected
            </td>
          </tr>
        `;
        break;
      case 'logs':
        document.getElementById('logs-container').innerHTML = `
          <div class="empty-state">
            <h3>No Logs</h3>
            <p>OneKit logs will appear here.</p>
          </div>
        `;
        break;
    }
  }

  updateComponentTree(components) {
    const treeElement = document.getElementById('component-tree');

    if (!components || components.length === 0) {
      treeElement.innerHTML = `
        <div class="empty-state">
          <h3>No Components Detected</h3>
          <p>Components will appear here when OneKit is loaded on the page.</p>
        </div>
      `;
      return;
    }

    const renderComponent = (component, depth = 0) => {
      const indent = '  '.repeat(depth);
      const props = component.props ? Object.keys(component.props).slice(0, 3).join(', ') : '';
      const hasChildren = component.children && component.children.length > 0;

      let html = `${indent}<div class="component-node" data-id="${component.id}">
        ${indent}<span class="component-name">${component.name}</span>`;

      if (props) {
        html += ` <span class="component-props">{${props}}</span>`;
      }

      html += '</div>';

      if (hasChildren) {
        component.children.forEach(child => {
          html += renderComponent(child, depth + 1);
        });
      }

      return html;
    };

    treeElement.innerHTML = components.map(comp => renderComponent(comp)).join('');

    // Add click handlers
    treeElement.querySelectorAll('.component-node').forEach(node => {
      node.addEventListener('click', () => {
        this.selectComponent(node.dataset.id);
      });
    });
  }

  selectComponent(componentId) {
    // Remove previous selection
    document.querySelectorAll('.component-node').forEach(node => {
      node.classList.remove('selected');
    });

    // Select new component
    const selectedNode = document.querySelector(`[data-id="${componentId}"]`);
    if (selectedNode) {
      selectedNode.classList.add('selected');
      this.selectedComponent = componentId;

      // Request component details
      if (chrome && chrome.runtime) {
        chrome.runtime.sendMessage({
          action: 'getComponentDetails',
          componentId: componentId
        });
      }
    }
  }

  updateReactiveState(state) {
    const stateElement = document.getElementById('reactive-state');

    if (!state || Object.keys(state).length === 0) {
      stateElement.innerHTML = `
        <div class="empty-state">
          <h3>No Reactive State</h3>
          <p>Reactive state will appear here when components are mounted.</p>
        </div>
      `;
      return;
    }

    const renderState = (obj, path = '') => {
      let html = '';

      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        const valueStr = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);

        html += `
          <div class="state-item">
            <div class="state-key">${currentPath}</div>
            <div class="state-value">${valueStr}</div>
          </div>
        `;

        if (typeof value === 'object' && value !== null) {
          html += renderState(value, currentPath);
        }
      }

      return html;
    };

    stateElement.innerHTML = renderState(state);
  }

  updateRouterState(routerData) {
    const routerElement = document.getElementById('router-info');

    if (!routerData) {
      routerElement.innerHTML = `
        <div class="empty-state">
          <h3>No Router Detected</h3>
          <p>Router information will appear here when OneKit Router is initialized.</p>
        </div>
      `;
      return;
    }

    routerElement.innerHTML = `
      <div class="state-item">
        <div class="state-key">Current Route</div>
        <div class="state-value">${routerData.currentRoute || 'N/A'}</div>
      </div>
      <div class="state-item">
        <div class="state-key">Route Params</div>
        <div class="state-value">${JSON.stringify(routerData.params || {}, null, 2)}</div>
      </div>
      <div class="state-item">
        <div class="state-key">Query Params</div>
        <div class="state-value">${JSON.stringify(routerData.query || {}, null, 2)}</div>
      </div>
    `;
  }

  addNetworkRequest(request) {
    const tbody = document.getElementById('network-table-body');

    // Remove empty state if present
    if (tbody.querySelector('td[colspan]')) {
      tbody.innerHTML = '';
    }

    const row = document.createElement('tr');
    const statusClass = request.status >= 200 && request.status < 300 ? 'status-success' :
                       request.status >= 400 ? 'status-error' : 'status-pending';

    row.innerHTML = `
      <td>${request.method}</td>
      <td>${request.url}</td>
      <td class="${statusClass}">${request.status || 'Pending'}</td>
      <td>${request.duration || '0'}ms</td>
      <td>${request.size || '0'}B</td>
    `;

    tbody.insertBefore(row, tbody.firstChild);
  }

  addLog(logData) {
    const logsContainer = document.getElementById('logs-container');

    // Remove empty state if present
    if (logsContainer.querySelector('.empty-state')) {
      logsContainer.innerHTML = '';
    }

    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${logData.level || 'info'}`;

    const timestamp = new Date().toLocaleTimeString();
    logEntry.textContent = `[${timestamp}] ${logData.message}`;

    logsContainer.appendChild(logEntry);
    logsContainer.scrollTop = logsContainer.scrollHeight;
  }

  updatePerformance(metrics) {
    const perfElement = document.getElementById('performance-info');

    if (!metrics) {
      perfElement.innerHTML = `
        <div class="empty-state">
          <h3>Performance Metrics</h3>
          <p>Performance data will appear here.</p>
        </div>
      `;
      return;
    }

    perfElement.innerHTML = `
      <div class="state-item">
        <div class="state-key">VDOM Render Time</div>
        <div class="state-value">${metrics.vdomRenderTime || 0}ms</div>
      </div>
      <div class="state-item">
        <div class="state-key">VDOM Patch Time</div>
        <div class="state-value">${metrics.vdomPatchTime || 0}ms</div>
      </div>
      <div class="state-item">
        <div class="state-key">DOM Operations</div>
        <div class="state-value">${metrics.domOperations || 0}</div>
      </div>
      <div class="state-item">
        <div class="state-key">Memory Usage</div>
        <div class="state-value">${metrics.memoryUsage || 'N/A'}</div>
      </div>
    `;
  }
}

// Initialize DevTools when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new OneKitDevTools();
});
