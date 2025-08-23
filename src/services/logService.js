import Dexie from 'dexie';
import { nanoid } from 'nanoid';

const db = new Dexie('llm_agent_logs');
db.version(1).stores({
  workflow_runs: 'id, workflowId, startedAt, status',
  node_logs: 'id, runId, nodeId, timestamp'
});

export const logService = {
  async createRun(workflowId, inputData) {
    const id = nanoid();
    const runData = {
      id,
      workflowId,
      startedAt: new Date().toISOString(),
      status: 'running',
      inputData: JSON.stringify(inputData || {})
    };
    
    await db.workflow_runs.add(runData);
    return id;
  },

  async updateRun(runId, data) {
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    if (data.status === 'completed' || data.status === 'failed' || data.status === 'stopped') {
      updateData.endedAt = new Date().toISOString();
    }
    
    await db.workflow_runs.update(runId, updateData);
  },

  async addNodeLog(logData) {
    const id = nanoid();
    const nodeLogData = {
      id,
      runId: logData.runId,
      nodeId: logData.nodeId,
      timestamp: new Date().toISOString(),
      status: logData.status,
      inputs: JSON.stringify(logData.inputs || {}),
      outputs: JSON.stringify(logData.outputs || {}),
      error: logData.error || null,
      processingTime: logData.processingTime || null
    };
    
    await db.node_logs.add(nodeLogData);
    return id;
  },

  async getRunsForWorkflow(workflowId) {
    const runs = await db.workflow_runs
      .where('workflowId')
      .equals(workflowId)
      .toArray();
    
    // 日付順でソート（最新が最初）
    runs.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
    
    return runs.map(run => ({
      ...run,
      inputData: JSON.parse(run.inputData || '{}')
    }));
  },

  async getLogsForRun(runId) {
    const logs = await db.node_logs
      .where('runId')
      .equals(runId)
      .toArray();
    
    // タイムスタンプ順でソート
    logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    return logs.map(log => ({
      ...log,
      inputs: JSON.parse(log.inputs || '{}'),
      outputs: JSON.parse(log.outputs || '{}')
    }));
  },

  async clearAllLogs() {
    await db.workflow_runs.clear();
    await db.node_logs.clear();
  },

  async getRun(runId) {
    const run = await db.workflow_runs.get(runId);
    if (run) {
      return {
        ...run,
        inputData: JSON.parse(run.inputData || '{}')
      };
    }
    return null;
  }
};

export default logService;