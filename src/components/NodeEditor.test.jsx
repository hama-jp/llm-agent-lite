/** @vitest-environment jsdom */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import NodeEditor from './NodeEditor';

vi.mock('../services/llmService.js', () => ({
  default: {
    loadSettings: vi.fn().mockReturnValue({
      provider: 'openai',
      model: 'gpt-5-nano',
      temperature: 1.0,
      apiKey: 'test-key'
    })
  }
}));

// Helper function to set input value and dispatch events
function setReactInputValue(element, value) {
  const { set: valueSetter } = Object.getOwnPropertyDescriptor(
    element.constructor.prototype,
    'value'
  );
  valueSetter.call(element, value);
  const event = new Event('input', { bubbles: true });
  element.dispatchEvent(event);
}

describe('NodeEditor', () => {
  beforeAll(() => {
    // Mock ResizeObserver
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    // Mock getBoundingClientRect for layout-dependent calculations
    if (global.Element) {
      global.Element.prototype.getBoundingClientRect = vi.fn(() => ({
        width: 100,
        height: 100,
        top: 0,
        left: 0,
        bottom: 100,
        right: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }));
    }
  });

  let container;
  let root;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
    container = null;
    vi.useRealTimers();
  });

  it('should update form immediately and debounce global state update', async () => {
    act(() => {
      root.render(<NodeEditor />);
    });

    // Add an 'llm' node to have multiple fields
    act(() => {
      const canvas = container.querySelector('.cursor-crosshair');
      canvas.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 200, clientY: 200 }));
    });
    await act(async () => { vi.runAllTicks(); });
    const addButton = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('LLM生成'));
    act(() => { addButton.click(); });

    // Select the node
    let nodeElement;
    await act(async () => {
      vi.runAllTicks();
      nodeElement = container.querySelector('.cursor-move');
    });
    act(() => { nodeElement.click(); });

    // Find input fields
    let labelInput, promptTextarea;
    await act(async () => {
      vi.runAllTicks();
      labelInput = container.querySelector('input[type="text"]');
      promptTextarea = container.querySelector('textarea');
    });

    const initialLabel = labelInput.value;
    const newLabel = 'New Label';
    const newPrompt = 'New Prompt';

    // Simulate typing in label
    act(() => {
        setReactInputValue(labelInput, newLabel);
    });

    // Check immediate UI update for label
    expect(labelInput.value).toBe(newLabel);
    // Global state should not have updated yet
    let nodeLabelInCanvas = nodeElement.querySelector('.truncate');
    expect(nodeLabelInCanvas.textContent).toBe(initialLabel);

    // Simulate typing in prompt quickly after
    act(() => {
        setReactInputValue(promptTextarea, newPrompt);
    });

    // Check immediate UI update for prompt
    expect(promptTextarea.value).toBe(newPrompt);

    // Advance timers
    await act(async () => {
      vi.advanceTimersByTime(600); // Past the 500ms debounce
      await vi.runAllTicks();
    });

    // Check if the global state has been updated with both changes
    const updatedNodeElement = container.querySelector('.cursor-move');
    nodeLabelInCanvas = updatedNodeElement.querySelector('.truncate');
    expect(nodeLabelInCanvas.textContent).toBe(newLabel);

    const nodePromptInCanvas = updatedNodeElement.querySelectorAll('.truncate')[1];
    expect(nodePromptInCanvas.textContent).toContain(newPrompt.substring(0, 30));
  });
});
