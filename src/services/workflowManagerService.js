import StorageService from './storageService.js'

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

class WorkflowManagerService {
  constructor() {
    this._initializeWorkflows();
  }

  _initializeWorkflows() {
    const workflows = this.getWorkflows();
    if (Object.keys(workflows).length === 0) {
      const newWorkflow = this.createNewWorkflow();
      this.saveWorkflow(newWorkflow);
      this.setCurrentWorkflowId(newWorkflow.id);
    }
  }

  getWorkflows() {
    return StorageService.getWorkflows({});
  }

  getWorkflow(id) {
    const workflows = this.getWorkflows();
    return workflows[id] || null;
  }

  saveWorkflow(workflowData) {
    if (!workflowData || !workflowData.id) {
      console.error("Invalid workflow data provided to saveWorkflow");
      return;
    }
    const workflows = this.getWorkflows();
    workflows[workflowData.id] = {
      ...workflowData,
      lastModified: new Date().toISOString(),
    };
    StorageService.setWorkflows(workflows);
  }

  deleteWorkflow(id) {
    const workflows = this.getWorkflows();
    delete workflows[id];
    StorageService.setWorkflows(workflows);

    if (this.getCurrentWorkflowId() === id) {
      const remainingIds = Object.keys(workflows);
      if (remainingIds.length > 0) {
        this.setCurrentWorkflowId(remainingIds[0]);
      } else {
        const newWorkflow = this.createNewWorkflow();
        this.saveWorkflow(newWorkflow);
        this.setCurrentWorkflowId(newWorkflow.id);
      }
    }
  }

  getCurrentWorkflowId() {
    return StorageService.getCurrentWorkflowId();
  }

  setCurrentWorkflowId(id) {
    StorageService.setCurrentWorkflowId(id);
  }

  createNewWorkflow(name = '新規フロー') {
    const newId = generateId();
    return {
      id: newId,
      name: name,
      nodes: [],
      connections: [],
      lastModified: new Date().toISOString(),
    };
  }
}

const workflowManagerService = new WorkflowManagerService();
export default workflowManagerService;
