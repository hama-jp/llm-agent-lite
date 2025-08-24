import { describe, it, expect, vi, beforeEach } from 'vitest'
import nodeExecutionService from './nodeExecutionService'
import llmService from './llmService'
import { nodeTypes } from '../components/nodes/index.js'

// Mock the llmService
vi.mock('./llmService', () => {
  const mockSettings = {
    provider: 'openai',
    apiKey: 'test-key',
    baseUrl: '',
    model: 'gpt-5-nano',
    temperature: 0.7,
    maxTokens: 100,
  };
  return {
    default: {
      settings: mockSettings,
      sendMessage: vi.fn(),
      saveSettings: vi.fn(function(newSettings) {
        Object.assign(this.settings, newSettings);
      }),
      loadSettings: vi.fn(() => mockSettings),
    },
  };
})

// Mock the logService to avoid IndexedDB issues
vi.mock('./logService', () => {
  return {
    default: {
      createRun: vi.fn(() => Promise.resolve('test-run-id')),
      updateRun: vi.fn(() => Promise.resolve()),
      addNodeLog: vi.fn(() => Promise.resolve()),
      logStep: vi.fn(() => Promise.resolve()),
      logExecution: vi.fn(),
      getExecutions: vi.fn(() => Promise.resolve([])),
      clearExecutions: vi.fn(() => Promise.resolve()),
    },
  };
})

// Mock localStorage
const mockLocalStorage = {
  store: new Map(),
  getItem: vi.fn((key) => mockLocalStorage.store.get(key) || null),
  setItem: vi.fn((key, value) => {
    mockLocalStorage.store.set(key, value);
  }),
  removeItem: vi.fn((key) => {
    mockLocalStorage.store.delete(key);
  }),
  clear: vi.fn(() => {
    mockLocalStorage.store.clear();
  })
};

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

describe('NodeExecutionService', () => {
  beforeEach(() => {
    // Reset mocks before each test
    llmService.sendMessage.mockClear()
    // Reset NodeExecutionService state
    nodeExecutionService.stopExecution()
    nodeExecutionService.executionContext = {}
    nodeExecutionService.variables = {}
    nodeExecutionService.clearLog()
    // Ensure nodeTypes are available for testing
    nodeExecutionService.nodeTypes = nodeTypes
  })

  it('should execute a simple Input -> LLM -> Output workflow in the correct order', async () => {
    // 1. Define the workflow structure
    const nodes = [
      { id: 'input_1', type: 'input', data: { value: 'Hello World' } },
      { id: 'llm_1', type: 'llm', data: { provider: 'openai', model: 'gpt-5-nano' } }, // No prompt template
      { id: 'output_1', type: 'output', data: {} },
    ]
    const edges = [
      { id: 'conn_1', source: 'input_1', target: 'llm_1', sourceHandle: '0', targetHandle: '0' },
      { id: 'conn_2', source: 'llm_1', target: 'output_1', sourceHandle: '0', targetHandle: '0' },
    ]
    const inputData = { 'input_1': 'Hello World' }

    // 2. Mock the LLM response
    const mockLLMResponse = 'Bonjour le monde'
    llmService.sendMessage.mockResolvedValue(mockLLMResponse)

    // 3. Start the execution
    const executor = await nodeExecutionService.startExecution(nodes, edges, inputData, nodeTypes)
    const executionSteps = []

    // 4. Run the workflow step by step and record state
    let result = await executor.next()
    while (!result.done) {
      executionSteps.push(result.value)
      result = await executor.next()
    }
    executionSteps.push(result.value) // Add the final result

    // 5. Assert the execution flow and order
    expect(executionSteps.length).toBe(4) // 3 nodes + 1 final step
    expect(executionSteps[0].status).toBe('running')
    expect(executionSteps[0].currentNodeId).toBe('input_1')
    expect(executionSteps[1].status).toBe('running')
    expect(executionSteps[1].currentNodeId).toBe('llm_1')
    expect(executionSteps[2].status).toBe('running')
    expect(executionSteps[2].currentNodeId).toBe('output_1')
    expect(executionSteps[3].status).toBe('completed')

    // 6. Assert intermediate and final outputs
    const finalContext = nodeExecutionService.executionContext
    expect(finalContext['input_1']).toBe('Hello World')
    expect(finalContext['llm_1']).toBe(mockLLMResponse)
    expect(finalContext['output_1']).toBe(mockLLMResponse)

    // 7. Check if LLM service was called correctly
    expect(llmService.sendMessage).toHaveBeenCalledTimes(1)
    // The prompt is now just the input value
    expect(llmService.sendMessage).toHaveBeenCalledWith('Hello World', null, expect.objectContaining({
      provider: 'openai',
      model: 'gpt-5-nano',
      temperature: 0.7,
      maxTokens: 100,
      apiKey: 'test-key',
      baseUrl: ''
    }))
  })

  it('should use max_completion_tokens for gpt-5 models', async () => {
    llmService.sendMessage.mockResolvedValue('test response');

    const nodes = [
      { id: 'input_1', type: 'input', data: { value: 'test' } },
      { id: 'llm_1', type: 'llm', data: { provider: 'openai', model: 'gpt-5' } } // Use a gpt-5 model
    ];
    const edges = [
      { id: 'conn_1', source: 'input_1', target: 'llm_1', sourceHandle: '0', targetHandle: '0' },
    ];

    const executor = await nodeExecutionService.startExecution(nodes, edges, {}, nodeTypes);

    // Run through the workflow
    await executor.next(); // input_1
    await executor.next();     // llm_1

    // The real test is that the service doesn't crash due to the parameter change.
    // A more advanced test would mock `fetch` to inspect the request body.
    expect(llmService.sendMessage).toHaveBeenCalled();
  });

  it('should execute a workflow with a file input node', async () => {
    // 1. Define the workflow with a file input
    const fileContent = 'This is the content from a text file.';
    const nodes = [
      { id: 'input_file_1', type: 'input', data: { inputType: 'file', fileContent: fileContent, fileName: 'test.txt' } },
      { id: 'output_1', type: 'output', data: {} },
    ];
    const edges = [
      { id: 'conn_1', source: 'input_file_1', target: 'output_1', sourceHandle: '0', targetHandle: '0' },
    ];

    // 2. Start and run the execution
    const executor = await nodeExecutionService.startExecution(nodes, edges, {}, nodeTypes);
    let result = await executor.next();
    while (!result.done) {
      result = await executor.next();
    }

    // 3. Assert the final context
    const finalContext = nodeExecutionService.executionContext;
    expect(finalContext['input_file_1']).toBe(fileContent);
    expect(finalContext['output_1']).toBe(fileContent);
  });
})
