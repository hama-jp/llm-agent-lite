import StorageService from './storageService.js'

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function loadSampleWorkflow(filename) {
  try {
    const response = await fetch(`/samples/${filename}`);
    if (!response.ok) {
      console.warn(`Failed to load sample file ${filename}`);
      return null;
    }
    const workflow = await response.json();
    return workflow;
  } catch (error) {
    console.warn(`Failed to parse sample file ${filename}:`, error);
    return null;
  }
}

class WorkflowManagerService {
  constructor() {
    this._initialized = false;
  }

  async initialize() {
    if (this._initialized) return;
    
    const workflows = this.getWorkflows();
    if (Object.keys(workflows).length === 0) {
      console.log('Setting up initial workflows...');
      await this._loadInitialSamples();
    }
    this._initialized = true;
  }

  async _loadInitialSamples() {
    const sampleFiles = [
      '01_simple_workflow.json',
      '02_text_combiner_workflow.json', 
      '03_control_flow_workflow.json'
    ];

    const loadedWorkflows = [];
    
    for (const filename of sampleFiles) {
      const workflow = await loadSampleWorkflow(filename);
      if (workflow) {
        // IDを新規生成して重複を避ける
        const workflowWithNewId = {
          ...workflow,
          id: generateId(),
          lastModified: new Date().toISOString()
        };
        console.log('💾 Saving sample workflow:', workflowWithNewId.name, 'nodes:', workflowWithNewId.flow?.nodes?.length || 0);
        this.saveWorkflow(workflowWithNewId);
        loadedWorkflows.push(workflowWithNewId);
        console.log(`✅ Imported sample workflow "${workflow.name}"`);
      }
    }

    // Set the first loaded workflow as the current workflow
    if (loadedWorkflows.length > 0) {
      this.setCurrentWorkflowId(loadedWorkflows[0].id);
      console.log(`Set "${loadedWorkflows[0].name}" as initial workflow`);
    } else {
      // Create a default workflow if sample files couldn't be loaded
      const newWorkflow = this.createNewWorkflow();
      this.saveWorkflow(newWorkflow);
      this.setCurrentWorkflowId(newWorkflow.id);
      console.log('Created default workflow');
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

  createNewWorkflow(name = 'New Workflow') {
    const newId = generateId();
    return {
      id: newId,
      name: name,
      flow: {
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      lastModified: new Date().toISOString(),
    };
  }
}

const workflowManagerService = new WorkflowManagerService();
export default workflowManagerService;
