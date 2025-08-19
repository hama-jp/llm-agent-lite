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

// Helper function to set input value and dispatch events
function setReactInputValue(input, value) {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
    ).set;
    nativeInputValueSetter.call(input, value);
    const event = new Event('input', { bubbles: true });
    input.dispatchEvent(event);
}

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

  it('should debounce node data updates on input change', async () => {
    act(() => {
      root.render(<NodeEditor />);
    });

    // 1. Add an 'input' node
    act(() => {
      const canvas = container.querySelector('.cursor-crosshair');
      const event = new MouseEvent('contextmenu', { bubbles: true, clientX: 200, clientY: 200 });
      canvas.dispatchEvent(event);
    });

    await act(async () => {
      vi.runAllTicks();
    });

    const addInputButton = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('入力'));
    expect(addInputButton).toBeDefined();

    act(() => {
      addInputButton.click();
    });

    // 2. Select the node
    let nodeElement;
    await act(async () => {
      vi.runAllTicks();
      nodeElement = container.querySelector('.cursor-move');
    });
    expect(nodeElement).toBeDefined();

    act(() => {
      nodeElement.click();
    });

    // 3. Find the input field for the node's label
    let labelInput;
    await act(async () => {
      vi.runAllTicks();
      labelInput = container.querySelector('input[type="text"]');
    });
    expect(labelInput).toBeDefined();

    const initialLabel = labelInput.value;
    const newLabel = 'New Test Label';

    // 4. Simulate typing
    act(() => {
        setReactInputValue(labelInput, newLabel);
    });

    // 5. Check immediate UI update
    expect(labelInput.value).toBe(newLabel);

    // The node label in the canvas should not have updated yet
    let nodeLabelInCanvas = nodeElement.querySelector('.truncate');
    expect(nodeLabelInCanvas.textContent).toBe(initialLabel);

    // 6. Advance timers
    await act(async () => {
      vi.advanceTimersByTime(600); // Past the 500ms debounce
      await vi.runAllTicks();
    });

    // 7. Check if the global state has been updated
    const updatedNodeElement = container.querySelector('.cursor-move');
    nodeLabelInCanvas = updatedNodeElement.querySelector('.truncate');
    expect(nodeLabelInCanvas.textContent).toBe(newLabel);
  });
});
