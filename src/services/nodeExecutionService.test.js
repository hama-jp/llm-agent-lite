import { describe, it, expect, vi, beforeEach } from 'vitest'
import nodeExecutionService from './nodeExecutionService'
import llmService from './llmService'

// Mock the llmService
vi.mock('./llmService', () => ({
  default: {
    generateText: vi.fn(),
  },
}))

describe('NodeExecutionService', () => {
  beforeEach(() => {
    // Reset mocks before each test
    llmService.generateText.mockClear()
  })

  it('should execute a simple Input -> LLM -> Output workflow correctly', async () => {
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
    llmService.generateText.mockResolvedValue(mockLLMResponse)

    // 3. Start the execution
    const executor = nodeExecutionService.startExecution(nodes, connections, inputData)

    // 4. Run the workflow step by step
    let result = await executor.next()
    while (!result.done) {
      result = await executor.next()
    }

    // 5. Assert the final state
    expect(result.done).toBe(true)
    expect(result.value.status).toBe('completed')

    // The final output should be the result of the last node in the chain (output_1)
    const finalOutput = nodeExecutionService.executionContext['output_1']
    expect(finalOutput).toBe(mockLLMResponse)

    // Check if LLM service was called correctly
    expect(llmService.generateText).toHaveBeenCalledTimes(1)
    expect(llmService.generateText).toHaveBeenCalledWith('Translate to French: Hello World', expect.any(Object))
  })
})
