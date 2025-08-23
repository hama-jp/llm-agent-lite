import StorageService from './storageService.js'

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function loadSampleWorkflow(filename) {
  try {
    const response = await fetch(`/samples/${filename}`);
    if (!response.ok) {
      console.warn(`サンプルファイル ${filename} の読み込みに失敗しました`);
      return null;
    }
    const workflow = await response.json();
    return workflow;
  } catch (error) {
    console.warn(`サンプルファイル ${filename} の解析に失敗しました:`, error);
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
      console.log('初期ワークフロー設定中...');
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
        this.saveWorkflow(workflowWithNewId);
        loadedWorkflows.push(workflowWithNewId);
        console.log(`サンプルワークフロー「${workflow.name}」をインポートしました`);
      }
    }

    // 最初にロードされたワークフローを現在のワークフローに設定
    if (loadedWorkflows.length > 0) {
      this.setCurrentWorkflowId(loadedWorkflows[0].id);
      console.log(`初期ワークフローとして「${loadedWorkflows[0].name}」を設定しました`);
    } else {
      // サンプルファイルが読み込めない場合はデフォルトワークフローを作成
      const newWorkflow = this.createNewWorkflow();
      this.saveWorkflow(newWorkflow);
      this.setCurrentWorkflowId(newWorkflow.id);
      console.log('デフォルトワークフローを作成しました');
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
