import { createNodeDefinition } from '../types.js';

/**
 * HTTP Request Node Example
 * Demonstrates how to create a custom node for making HTTP requests
 */
export const HttpRequestNode = createNodeDefinition(
  'HTTP Request',
  '🌐',
  'blue',
  ['url', 'method', 'body', 'headers'], // Input ports
  ['response', 'error'], // Output ports: response for success, error for failures
  {
    method: 'GET',
    timeout: 5000,
    headers: {},
    followRedirects: true
  },
  {
    description: 'Make HTTP requests and return the response or error. Supports GET, POST, PUT, DELETE methods.',
    category: 'network'
  }
);

export default HttpRequestNode;

/*
Usage Example:

1. Add to index.js:
   import HttpRequestNode from './examples/HttpRequestNode.js';
   
   export const nodeTypes = {
     // ... existing nodes
     http_request: HttpRequestNode
   };

2. Add to category:
   export const nodesByCategory = {
     // ... existing categories
     'network': {
       name: 'Network',
       nodes: {
         http_request: HttpRequestNode
       }
     }
   };

3. The node will then be available in the UI for creating HTTP request workflows.
*/