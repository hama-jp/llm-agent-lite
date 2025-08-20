/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import workflowManagerService from './workflowManagerService';

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

describe('workflowManagerService', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should initialize with a new workflow if none exists', () => {
    // Re-instantiate to test constructor logic
    const newServiceInstance = new (workflowManagerService.constructor)();
    expect(localStorageMock.setItem).toHaveBeenCalledWith(expect.stringContaining('llm-agent-workflows'), expect.any(String));
    const workflows = newServiceInstance.getWorkflows();
    expect(Object.keys(workflows).length).toBe(1);
    const newWorkflowId = newServiceInstance.getCurrentWorkflowId();
    expect(newWorkflowId).not.toBeNull();
    expect(workflows[newWorkflowId].name).toBe('新規フロー');
  });

  it('should save and retrieve a workflow', () => {
    const newWorkflow = workflowManagerService.createNewWorkflow('Test Flow');
    workflowManagerService.saveWorkflow(newWorkflow);

    const retrieved = workflowManagerService.getWorkflow(newWorkflow.id);
    expect(retrieved.name).toBe('Test Flow');
    expect(retrieved.id).toBe(newWorkflow.id);
    expect(retrieved.lastModified).toBeDefined();
  });

  it('should get all workflows', () => {
    const wf1 = workflowManagerService.createNewWorkflow('Flow 1');
    const wf2 = workflowManagerService.createNewWorkflow('Flow 2');
    workflowManagerService.saveWorkflow(wf1);
    workflowManagerService.saveWorkflow(wf2);

    const allWorkflows = workflowManagerService.getWorkflows();
    expect(Object.keys(allWorkflows).length).toBe(2);
    expect(allWorkflows[wf1.id].name).toBe('Flow 1');
  });

  it('should delete a workflow', () => {
    const wf1 = workflowManagerService.createNewWorkflow('Flow 1');
    workflowManagerService.saveWorkflow(wf1);

    let allWorkflows = workflowManagerService.getWorkflows();
    expect(Object.keys(allWorkflows).length).toBe(1);

    workflowManagerService.setCurrentWorkflowId(wf1.id);
    workflowManagerService.deleteWorkflow(wf1.id);
    allWorkflows = workflowManagerService.getWorkflows();
    // After deleting the only workflow, a new one is created
    expect(Object.keys(allWorkflows).length).toBe(1);
    expect(allWorkflows[wf1.id]).toBeUndefined();
  });

  it('should manage current workflow ID', () => {
    workflowManagerService.setCurrentWorkflowId('test-id');
    expect(workflowManagerService.getCurrentWorkflowId()).toBe('test-id');
  });
});
