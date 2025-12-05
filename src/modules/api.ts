// HTTP/API Module
import { errorHandler } from '../core/error-handler';
import { sanitizeURL } from '../core/security';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: { [key: string]: string };
  body?: any;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  onProgress?: (progress: number) => void;
}

interface ResponseData {
  status: number;
  statusText: string;
  headers: { [key: string]: string };
  data: any;
  url: string;
}

const defaultHeaders = {
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest'
};

export function request(url: string, options: RequestOptions = {}): Promise<ResponseData> {
  return new Promise((resolve, reject) => {
    // Sanitize URL to prevent XSS
    const sanitizedUrl = sanitizeURL(url);
    if (!sanitizedUrl) {
      reject(new Error('Invalid URL'));
      return;
    }

    const config: RequestOptions = {
      method: 'GET',
      headers: { ...defaultHeaders },
      timeout: 30000,
      retries: 0,
      retryDelay: 1000,
      ...options
    };

    const makeRequest = (attempt: number = 0) => {
      const xhr = new XMLHttpRequest();

      // Set up timeout
      const timeoutId = setTimeout(() => {
        xhr.abort();
        reject(new Error('Request timeout'));
      }, config.timeout);

      xhr.open(config.method!, sanitizedUrl);

      // Set headers
      for (const header in config.headers) {
        xhr.setRequestHeader(header, config.headers![header]);
      }

      // Progress tracking
      if (config.onProgress) {
        xhr.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            config.onProgress!(e.loaded / e.total);
          }
        });
      }

      xhr.onload = function() {
        clearTimeout(timeoutId);

        const response: ResponseData = {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: parseHeaders(xhr.getAllResponseHeaders()),
          data: null,
          url: xhr.responseURL
        };

        try {
          // Try to parse JSON response
          if (xhr.responseText) {
            response.data = JSON.parse(xhr.responseText);
          }
        } catch (e) {
          // If not JSON, return as text
          response.data = xhr.responseText;
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(response);
        } else {
          const error = new Error(`HTTP ${xhr.status}: ${xhr.statusText}`);
          (error as any).response = response;

          if (attempt < (config.retries || 0)) {
            setTimeout(() => makeRequest(attempt + 1), config.retryDelay);
          } else {
            reject(error);
          }
        }
      };

      xhr.onerror = function() {
        clearTimeout(timeoutId);

        if (attempt < (config.retries || 0)) {
          setTimeout(() => makeRequest(attempt + 1), config.retryDelay);
        } else {
          reject(new Error('Network error'));
        }
      };

      // Send request
      if (config.body && typeof config.body === 'object') {
        xhr.send(JSON.stringify(config.body));
      } else {
        xhr.send(config.body);
      }
    };

    makeRequest();
  });
}

export function get(url: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<ResponseData> {
  return request(url, { ...options, method: 'GET' });
}

export function post(url: string, data?: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<ResponseData> {
  return request(url, { ...options, method: 'POST', body: data });
}

export function put(url: string, data?: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<ResponseData> {
  return request(url, { ...options, method: 'PUT', body: data });
}

export function del(url: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<ResponseData> {
  return request(url, { ...options, method: 'DELETE' });
}

export function patch(url: string, data?: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<ResponseData> {
  return request(url, { ...options, method: 'PATCH', body: data });
}

function parseHeaders(headerString: string): { [key: string]: string } {
  const headers: { [key: string]: string } = {};
  const lines = headerString.split('\n');

  for (const line of lines) {
    const index = line.indexOf(':');
    if (index > 0) {
      const name = line.slice(0, index).trim().toLowerCase();
      const value = line.slice(index + 1).trim();
      headers[name] = value;
    }
  }

  return headers;
}

// RESTful API helper
export class API {
  private baseURL: string;
  private defaultOptions: RequestOptions;

  constructor(baseURL: string, defaultOptions: RequestOptions = {}) {
    this.baseURL = baseURL.replace(/\/$/, ''); // Remove trailing slash
    this.defaultOptions = defaultOptions;
  }

  private buildURL(endpoint: string): string {
    return `${this.baseURL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  }

  get(endpoint: string, options: RequestOptions = {}): Promise<ResponseData> {
    return request(this.buildURL(endpoint), { ...this.defaultOptions, ...options, method: 'GET' });
  }

  post(endpoint: string, data?: any, options: RequestOptions = {}): Promise<ResponseData> {
    return request(this.buildURL(endpoint), { ...this.defaultOptions, ...options, method: 'POST', body: data });
  }

  put(endpoint: string, data?: any, options: RequestOptions = {}): Promise<ResponseData> {
    return request(this.buildURL(endpoint), { ...this.defaultOptions, ...options, method: 'PUT', body: data });
  }

  delete(endpoint: string, options: RequestOptions = {}): Promise<ResponseData> {
    return request(this.buildURL(endpoint), { ...this.defaultOptions, ...options, method: 'DELETE' });
  }

  patch(endpoint: string, data?: any, options: RequestOptions = {}): Promise<ResponseData> {
    return request(this.buildURL(endpoint), { ...this.defaultOptions, ...options, method: 'PATCH', body: data });
  }
}
