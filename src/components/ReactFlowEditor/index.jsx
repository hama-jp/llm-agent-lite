import React, { useCallback, useEffect, useState, useMemo } from 'react';
import ReactFlow, { Background, Controls, MiniMap, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import useReactFlowStore from '../../store/reactFlowStore';
import useExecutionStore from '../../store/executionStore';
import { useStore as useUIStore } from '../../store';

import InputNodeComponent from './nodes/InputNodeComponent';
import CustomEdge from './edges/CustomEdge';
import ContextMenu from './ContextMenu';
import { Button } from '@/components/ui/button';

import { nodeTypes as nodeDefinitions } from '../nodes/index.js';
import useWorkflowExecution from '../../hooks/useWorkflowExecution';
import workflowManagerService from '../../services/workflowManagerService';
import { debounce } from '../../lib/utils';

const rfSelector = (state) => ({
  nodes: state.nodes,
  edges: state.edges,
  viewport: state.viewport,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
  setNodes: state.setNodes,
  setViewport: state.setViewport,
  loadWorkflow: state.loadWorkflow,
});

const execSelector = (state) => ({
  executor: state.executor,
  setExecutor: state.setExecutor,
  setExecutionState: state.setExecutionState,
  setExecutionResult: state.setExecutionResult,
  setDebugLog: state.setDebugLog,
});

const nodeTypes = {
  input: InputNodeComponent,
  // This would be expanded to include all migrated node components
};

const edgeTypes = {
  custom: CustomEdge,
};

const ReactFlowEditor = () => {
  const { nodes, edges, viewport, onNodesChange, onEdgesChange, onConnect, setNodes, setViewport, loadWorkflow } = useReactFlowStore(rfSelector);
  const { executor, setExecutor, setExecutionState, setExecutionResult, setDebugLog } = useExecutionStore(execSelector);
  const { setContextMenu } = useUIStore(state => ({ setContextMenu: state.setContextMenu }));
  const { screenToFlowPosition, setViewport: setRfViewport } = useReactFlow();
  const [currentWorkflow, setCurrentWorkflow] = useState(null);

  // Initial load effect
  useEffect(() => {
    const initialize = async () => {
      await workflowManagerService.initialize();
      const currentId = workflowManagerService.getCurrentWorkflowId();
      if (currentId) {
        loadWorkflow(currentId);
        setCurrentWorkflow(workflowManagerService.getWorkflow(currentId));
      }
    };
    initialize();
  }, [loadWorkflow]);

  // Effect to set the viewport when a workflow is loaded
  useEffect(() => {
    if (viewport) {
      setRfViewport(viewport);
    }
  }, [viewport, setRfViewport]);

  // Auto-save effect
  const debouncedSave = useMemo(() =>
    debounce((wf) => {
      if (wf) {
        workflowManagerService.saveWorkflow(wf);
      }
    }, 500),
  []);

  useEffect(() => {
    if (currentWorkflow) {
      const wfToSave = {
        ...currentWorkflow,
        flow: { nodes, edges, viewport }
      };
      debouncedSave(wfToSave);
    }
  }, [nodes, edges, viewport, currentWorkflow, debouncedSave]);

  const { selectedNode, setSelectedNode } = useUIStore(state => ({
    selectedNode: state.selectedNode,
    setSelectedNode: state.setSelectedNode,
  }));

  const { handleRunAll } = useWorkflowExecution({
    nodes,
    connections: edges,
    nodeTypes: nodeDefinitions,
    setNodes,
    setExecutor,
    setExecutionState,
    setExecutionResult,
    setDebugLog,
    onSelectedNodeChange: setSelectedNode,
    selectedNode,
    executor,
  });

  const onPaneContextMenu = useCallback(
    (event) => {
      event.preventDefault();
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setContextMenu(position);
    },
    [screenToFlowPosition, setContextMenu]
  );

  return (
    <div style={{ width: '100%', height: '100%' }} onClick={() => setContextMenu(null)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneContextMenu={onPaneContextMenu}
        onViewportChange={setViewport}
        defaultViewport={viewport}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
      <ContextMenu />
      <div className="absolute top-2 right-2 z-10 space-x-2">
        <Button onClick={handleRunAll} variant="secondary">Run Workflow</Button>
      </div>
    </div>
  );
};

export default ReactFlowEditor;
