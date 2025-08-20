/** @vitest-environment jsdom */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import NodeEditor from './NodeEditor';
import workflowManagerService from '../services/workflowManagerService';

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

// Mock localStorage for the service
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
    clear: vi.fn(() => { store = {}; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });


describe('NodeEditor', () => {
  beforeAll(() => {
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    if (global.Element) {
      global.Element.prototype.getBoundingClientRect = vi.fn(() => ({
        width: 100, height: 100, top: 0, left: 0, bottom: 100, right: 100, x: 0, y: 0, toJSON: () => ({}),
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
    // Ensure there's a default workflow for the editor to load
    const newWorkflow = workflowManagerService.createNewWorkflow();
    localStorageMock.setItem('llm-agent-workflows', JSON.stringify({ [newWorkflow.id]: newWorkflow }));
    localStorageMock.setItem('llm-agent-current-workflow-id', newWorkflow.id);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
    container = null;
    vi.useRealTimers();
    localStorageMock.clear();
  });

  it('should render without crashing', () => {
    const mockOnSelectedNodeChange = vi.fn();
    const mockOnEditingNodeChange = vi.fn();

    act(() => {
      root.render(<NodeEditor
        onSelectedNodeChange={mockOnSelectedNodeChange}
        onEditingNodeChange={mockOnEditingNodeChange}
      />);
    });
    const topDiv = container.querySelector('.flex.h-full');
    expect(topDiv).not.toBeNull();
  });
});
