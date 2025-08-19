import { describe, it, expect, vi, beforeEach } from 'vitest'
import nodeExecutionService from './nodeExecutionService'
import llmService from './llmService'

// Mock the llmService
vi.mock('./llmService', () => ({
  default: {
    sendMessage: vi.fn(),
  },
}))

describe('NodeExecutionService', () => {
  beforeEach(() => {
    // Reset mocks before each test
    llmService.sendMessage.mockClear()
  })

  it('should execute a simple Input -> LLM -> Output workflow in the correct order', async () => {
    // 1. Define the workflow structure
    const nodes = [
      { id: 'input_1', type: 'input', data: { value: 'Hello World' } },
      { id: 'llm_1', type: 'llm', data: { prompt: 'Translate to French: {{input_1}}' } },
      { id: 'output_1', type: 'output', data: {} },
    ]
    const connections = [
      { id: 'conn_1', from: { nodeId: 'input_1', portIndex: 0 }, to: { nodeId: 'llm_1', portIndex: 0 } },
      { id: 'conn_2', from: { nodeId: 'llm_1', portIndex: 0 }, to: { nodeId: 'output_1', portIndex: 0 } },
    ]
    const inputData = { 'input_1': 'Hello World' }

    // 2. Mock the LLM response
    const mockLLMResponse = 'Bonjour le monde'
    llmService.sendMessage.mockResolvedValue(mockLLMResponse)

    // 3. Start the execution
    const executor = nodeExecutionService.startExecution(nodes, connections, inputData)
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
    expect(llmService.sendMessage).toHaveBeenCalledWith('Translate to French: Hello World', expect.any(Object))
  })
})
