/** @vitest-environment jsdom */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';

// Import components to test
import App from '../../App';
import Layout from '../Layout';
import ChatView from '../ChatView';
import WorkflowView from '../WorkflowView';
import DataView from '../DataView';
import SettingsView from '../SettingsView';
import NodeEditor from '../NodeEditor';

// Mock services
vi.mock('../../services/llmService.js', () => ({
  default: {
    loadSettings: vi.fn().mockReturnValue({
      provider: 'openai',
      model: 'gpt-5-nano',
      temperature: 1.0,
      apiKey: 'test-key'
    })
  }
}));

// Mock localStorage
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

// Mock ResizeObserver and getBoundingClientRect
const setupMocks = () => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  
  if (global.Element) {
    global.Element.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 100, height: 100, top: 0, left: 0, bottom: 100, right: 100, x: 0, y: 0, toJSON: () => ({}),
    }));
    
    // Mock scrollIntoView for ChatView
    global.Element.prototype.scrollIntoView = vi.fn();
  }
  
  // Mock HTMLCanvasElement for NodeEditor
  global.HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Array(4) })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => []),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    fillText: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
  }));
};

describe('Baseline Smoke Tests - 現状の動作確認', () => {
  beforeAll(() => {
    setupMocks();
  });

  let container;
  let root;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    localStorageMock.clear();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
    container = null;
    vi.useRealTimers();
  });

  describe('Core Components Rendering', () => {
    it('App component should render without crashing', () => {
      act(() => {
        root.render(<App />);
      });
      expect(container.querySelector('div')).not.toBeNull();
    });

    it('Layout component should render with sidebar', () => {
      const mockViewChange = vi.fn();
      const mockEditingChange = vi.fn();
      
      act(() => {
        root.render(
          <Layout 
            currentView="workflow" 
            onViewChange={mockViewChange}
            editingNode={null}
            onEditingNodeChange={mockEditingChange}
          >
            <div>Test Content</div>
          </Layout>
        );
      });
      
      expect(container.querySelector('div')).not.toBeNull();
    });

    it('ChatView component should render without crashing', () => {
      act(() => {
        root.render(<ChatView />);
      });
      expect(container.querySelector('div')).not.toBeNull();
    });

    it('WorkflowView component should render without crashing', () => {
      const mockSelectedNodeChange = vi.fn();
      const mockEditingNodeChange = vi.fn();
      
      act(() => {
        root.render(
          <WorkflowView
            selectedNode={null}
            onSelectedNodeChange={mockSelectedNodeChange}
            editingNode={null}
            onEditingNodeChange={mockEditingNodeChange}
          />
        );
      });
      expect(container.querySelector('div')).not.toBeNull();
    });

    it('DataView component should render without crashing', () => {
      act(() => {
        root.render(<DataView />);
      });
      expect(container.querySelector('div')).not.toBeNull();
    });

    it('SettingsView component should render without crashing', () => {
      act(() => {
        root.render(<SettingsView />);
      });
      expect(container.querySelector('div')).not.toBeNull();
    });

    it('NodeEditor component should render without crashing', () => {
      const mockSelectedNodeChange = vi.fn();
      const mockEditingNodeChange = vi.fn();
      
      act(() => {
        root.render(
          <NodeEditor
            onSelectedNodeChange={mockSelectedNodeChange}
            onEditingNodeChange={mockEditingNodeChange}
          />
        );
      });
      expect(container.querySelector('div')).not.toBeNull();
    });
  });

  describe('State Management Baseline', () => {
    it('App should handle view state correctly', () => {
      act(() => {
        root.render(<App />);
      });
      
      // 基本的なレンダリング確認
      expect(container.querySelector('div')).not.toBeNull();
    });

    it('NodeEditor should handle basic node operations', () => {
      const mockSelectedNodeChange = vi.fn();
      const mockEditingNodeChange = vi.fn();
      
      act(() => {
        root.render(
          <NodeEditor
            onSelectedNodeChange={mockSelectedNodeChange}
            onEditingNodeChange={mockEditingNodeChange}
          />
        );
      });
      
      // ノードエディターの基本要素が存在することを確認
      expect(container.querySelector('.flex')).not.toBeNull();
    });
  });

  describe('LocalStorage Integration', () => {
    it('should interact with localStorage without errors', () => {
      expect(() => {
        localStorage.setItem('test-key', 'test-value');
        localStorage.getItem('test-key');
        localStorage.removeItem('test-key');
      }).not.toThrow();
    });
  });
});