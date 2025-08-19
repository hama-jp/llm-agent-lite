const WORKFLOWS_KEY = 'llm-agent-workflows';
const CURRENT_WORKFLOW_ID_KEY = 'llm-agent-current-workflow-id';

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
    try {
      const workflowsStr = localStorage.getItem(WORKFLOWS_KEY);
      return workflowsStr ? JSON.parse(workflowsStr) : {};
    } catch (e) {
      console.error("Failed to parse workflows from localStorage", e);
      return {};
    }
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
    localStorage.setItem(WORKFLOWS_KEY, JSON.stringify(workflows));
  }

  deleteWorkflow(id) {
    const workflows = this.getWorkflows();
    delete workflows[id];
    localStorage.setItem(WORKFLOWS_KEY, JSON.stringify(workflows));

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
    return localStorage.getItem(CURRENT_WORKFLOW_ID_KEY);
  }

  setCurrentWorkflowId(id) {
    localStorage.setItem(CURRENT_WORKFLOW_ID_KEY, id);
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
