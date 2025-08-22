/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';

// Mock services and store
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

vi.mock('../../store/index.js', () => ({
  useStore: vi.fn(() => ({
    currentView: 'workflow',
    selectedNode: null,
    editingNode: null,
    sidebarOpen: true
  })),
  selectCurrentView: vi.fn(state => state.currentView),
  selectSelectedNode: vi.fn(state => state.selectedNode),
  selectEditingNode: vi.fn(state => state.editingNode),
  selectSidebarOpen: vi.fn(state => state.sidebarOpen),
  useUIActions: vi.fn(() => ({
    setCurrentView: vi.fn(),
    setSelectedNode: vi.fn(),
    setEditingNode: vi.fn(),
    setSidebarOpen: vi.fn()
  }))
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

describe('Baseline Smoke Tests - 現状の動作確認', () => {
  it('should interact with localStorage without errors', () => {
    expect(() => {
      localStorage.setItem('test-key', 'test-value');
      localStorage.getItem('test-key');
      localStorage.removeItem('test-key');
    }).not.toThrow();
  });

  it('should have working mock services', () => {
    expect(vi.isMockFunction(localStorageMock.getItem)).toBe(true);
    expect(vi.isMockFunction(localStorageMock.setItem)).toBe(true);
  });
});