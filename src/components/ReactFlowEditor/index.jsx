import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { ReactFlow, Background, Controls, MiniMap, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './ReactFlowEditor.css';

import useReactFlowStore from '../../store/reactFlowStore';
import useExecutionStore from '../../store/executionStore';
import { useStore as useUIStore } from '../../store';

import InputNodeComponent from './nodes/InputNodeComponent';
import OutputNodeComponent from './nodes/OutputNodeComponent';
import LLMNodeComponent from './nodes/LLMNodeComponent';
import IfNodeComponent from './nodes/IfNodeComponent';
import WhileNodeComponent from './nodes/WhileNodeComponent';
import TextNodeComponent from './nodes/TextNodeComponent';
import TextCombinerNodeComponent from './nodes/TextCombinerNodeComponent';
import VariableSetNodeComponent from './nodes/VariableSetNodeComponent';
import CustomNode from './nodes/CustomNode';
import CustomEdge from './edges/CustomEdge';
import ContextMenu from './ContextMenu';
import ExecutionOutputWindow from '../ExecutionOutputWindow';
import WorkflowToolbar from '../WorkflowToolbar';
import { Button } from '@/components/ui/button';

import { nodeTypes as nodeDefinitions } from '../nodes/index.js';
import useWorkflowExecution from '../../hooks/useWorkflowExecution';
import workflowManagerService from '../../services/workflowManagerService';
import { debounce } from '../../lib/utils';

// 個別のセレクター関数を定義
const selectNodes = (state) => state.nodes;
const selectEdges = (state) => state.edges;
const selectViewport = (state) => state.viewport;
const selectOnNodesChange = (state) => state.onNodesChange;
const selectOnEdgesChange = (state) => state.onEdgesChange;
const selectOnConnect = (state) => state.onConnect;
const selectSetNodes = (state) => state.setNodes;
const selectSetViewport = (state) => state.setViewport;
const selectLoadWorkflow = (state) => state.loadWorkflow;

const selectExecutor = (state) => state.executor;
const selectSetExecutor = (state) => state.setExecutor;
const selectSetExecutionState = (state) => state.setExecutionState;
const selectSetExecutionResult = (state) => state.setExecutionResult;
const selectSetDebugLog = (state) => state.setDebugLog;

const nodeTypes = {
  input: InputNodeComponent,
  output: OutputNodeComponent,
  llm: LLMNodeComponent,
  if: IfNodeComponent,
  while: WhileNodeComponent,
  text: TextNodeComponent,
  text_combiner: TextCombinerNodeComponent,
  variable_set: VariableSetNodeComponent,
  // 他の未実装ノードタイプはCustomNodeで処理
};

const edgeTypes = {
  custom: CustomEdge,
};

const ReactFlowEditor = ({ selectedNode, onSelectedNodeChange, editingNode, onEditingNodeChange }) => {
  // 個別のセレクターを使用してZustandストアから値を取得
  const rawNodes = useReactFlowStore(selectNodes);
  const rawEdges = useReactFlowStore(selectEdges);
  const nodes = useMemo(() => {
    const result = Array.isArray(rawNodes) ? rawNodes : [];
    console.log('ReactFlowEditor - nodes:', result);
    return result;
  }, [rawNodes]);
  const edges = useMemo(() => {
    const result = Array.isArray(rawEdges) ? rawEdges : [];
    console.log('ReactFlowEditor - edges:', result);
    return result;
  }, [rawEdges]);
  
  console.log('ReactFlowEditor レンダリング - nodes.length:', nodes.length, 'edges.length:', edges.length);
  const viewport = useReactFlowStore(selectViewport);
  const onNodesChange = useReactFlowStore(selectOnNodesChange);
  const onEdgesChange = useReactFlowStore(selectOnEdgesChange);
  const onConnect = useReactFlowStore(selectOnConnect);
  const setNodes = useReactFlowStore(selectSetNodes);
  const setViewport = useReactFlowStore(selectSetViewport);
  const loadWorkflow = useReactFlowStore(selectLoadWorkflow);

  const executor = useExecutionStore(selectExecutor);
  const executionState = useExecutionStore(state => state.executionState);
  const executionResult = useExecutionStore(state => state.executionResult);
  const debugLog = useExecutionStore(state => state.debugLog);
  const setExecutor = useExecutionStore(selectSetExecutor);
  const setExecutionState = useExecutionStore(selectSetExecutionState);
  const setExecutionResult = useExecutionStore(selectSetExecutionResult);
  const setDebugLog = useExecutionStore(selectSetDebugLog);

  const setContextMenu = useUIStore(state => state.setContextMenu);
  const setEditingNode = useUIStore(state => state.setEditingNode);
  const showDebugLog = useUIStore(state => state.showDebugLog);
  const setShowDebugLog = useUIStore(state => state.setShowDebugLog);
  // selectedNodeとonSelectedNodeChangeはpropsから受け取る
  const { screenToFlowPosition, setViewport: setRfViewport } = useReactFlow();
  const [currentWorkflow, setCurrentWorkflow] = useState(null);
  const [workflows, setWorkflows] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Initial load effect
  useEffect(() => {
    const initialize = async () => {
      try {
        await workflowManagerService.initialize();
        const currentId = workflowManagerService.getCurrentWorkflowId();
        const workflowsData = workflowManagerService.getWorkflows();
        const workflowsList = Object.values(workflowsData);
        setWorkflows(workflowsList);
        
        if (currentId) {
          const workflow = workflowManagerService.getWorkflow(currentId);
          if (workflow && workflow.flow) {
            loadWorkflow(currentId);
            setCurrentWorkflow(workflow);
          } else {
            console.warn('ワークフローデータが無効です:', workflow);
            loadWorkflow(null);
          }
        } else {
          loadWorkflow(null);
        }
      } catch (error) {
        console.error('初期化エラー:', error);
        loadWorkflow(null);
      }
    };
    initialize();
  }, [loadWorkflow]);

  // Effect to set the viewport when a workflow is loaded
  // Temporarily disabled to avoid infinite loops
  // useEffect(() => {
  //   if (viewport && viewport.x !== undefined && viewport.y !== undefined && viewport.zoom !== undefined) {
  //     setRfViewport(viewport);
  //   }
  // }, [viewport, setRfViewport]);

  // Auto-save effect
  const debouncedSave = useCallback(
    debounce((wf) => {
      if (wf) {
        workflowManagerService.saveWorkflow(wf);
      }
    }, 500),
  []);

  // Auto-save effect - re-enabled with improved logic
  useEffect(() => {
    if (currentWorkflow && nodes.length >= 0 && !hasUnsavedChanges) {
      setHasUnsavedChanges(true);
    }
  }, [nodes, edges, viewport, currentWorkflow, hasUnsavedChanges]);

  // Workflow management handlers
  const handleWorkflowSave = useCallback(() => {
    if (currentWorkflow) {
      const workflowToSave = {
        ...currentWorkflow,
        flow: { nodes, edges, viewport }
      };
      workflowManagerService.saveWorkflow(workflowToSave);
      setHasUnsavedChanges(false);
    }
  }, [currentWorkflow, nodes, edges, viewport]);

  const handleWorkflowLoad = useCallback((workflowId) => {
    const workflow = workflowManagerService.getWorkflow(workflowId);
    if (workflow && workflow.flow) {
      loadWorkflow(workflowId);
      setCurrentWorkflow(workflow);
      workflowManagerService.setCurrentWorkflowId(workflowId);
      setHasUnsavedChanges(false);
    }
  }, [loadWorkflow]);

  const handleWorkflowCreate = useCallback((name) => {
    const newWorkflow = workflowManagerService.createNewWorkflow(name);
    workflowManagerService.saveWorkflow(newWorkflow);
    workflowManagerService.setCurrentWorkflowId(newWorkflow.id);
    loadWorkflow(newWorkflow.id);
    setCurrentWorkflow(newWorkflow);
    setHasUnsavedChanges(false);
    
    // Update workflows list
    const workflowsData = workflowManagerService.getWorkflows();
    setWorkflows(Object.values(workflowsData));
  }, [loadWorkflow]);

  const handleWorkflowRename = useCallback((newName) => {
    if (currentWorkflow) {
      const updatedWorkflow = { ...currentWorkflow, name: newName };
      workflowManagerService.saveWorkflow(updatedWorkflow);
      setCurrentWorkflow(updatedWorkflow);
      
      // Update workflows list
      const workflowsData = workflowManagerService.getWorkflows();
      setWorkflows(Object.values(workflowsData));
    }
  }, [currentWorkflow]);

  const handleWorkflowDelete = useCallback((workflowId) => {
    workflowManagerService.deleteWorkflow(workflowId);
    
    // Update workflows list
    const workflowsData = workflowManagerService.getWorkflows();
    const workflowsList = Object.values(workflowsData);
    setWorkflows(workflowsList);
    
    // Load next workflow
    const currentId = workflowManagerService.getCurrentWorkflowId();
    if (currentId) {
      handleWorkflowLoad(currentId);
    }
  }, [handleWorkflowLoad]);

  const handleWorkflowExport = useCallback(() => {
    if (currentWorkflow) {
      const dataStr = JSON.stringify(currentWorkflow, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentWorkflow.name || 'workflow'}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
  }, [currentWorkflow]);

  const handleWorkflowImport = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedWorkflow = JSON.parse(e.target.result);
        // Generate new ID to avoid conflicts
        const newWorkflow = {
          ...importedWorkflow,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          lastModified: new Date().toISOString()
        };
        
        workflowManagerService.saveWorkflow(newWorkflow);
        workflowManagerService.setCurrentWorkflowId(newWorkflow.id);
        loadWorkflow(newWorkflow.id);
        setCurrentWorkflow(newWorkflow);
        setHasUnsavedChanges(false);
        
        // Update workflows list
        const workflowsData = workflowManagerService.getWorkflows();
        setWorkflows(Object.values(workflowsData));
      } catch (error) {
        console.error('Failed to import workflow:', error);
      }
    };
    reader.readAsText(file);
  }, [loadWorkflow]);

  const handleWorkflowDuplicate = useCallback((workflow) => {
    const duplicatedWorkflow = {
      ...workflow,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `${workflow.name} (Copy)`,
      lastModified: new Date().toISOString()
    };
    
    workflowManagerService.saveWorkflow(duplicatedWorkflow);
    
    // Update workflows list
    const workflowsData = workflowManagerService.getWorkflows();
    setWorkflows(Object.values(workflowsData));
  }, []);

  // プロパティ変更をReactFlowストアに反映
  const handleEditingNodeChange = useCallback((updatedNode) => {
    if (!updatedNode) {
      onEditingNodeChange?.(null);
      return;
    }
    
    // ReactFlowストアのノードを更新
    setNodes(prevNodes => {
      if (!Array.isArray(prevNodes)) return [];
      return prevNodes.map(node => 
        node.id === updatedNode.id ? updatedNode : node
      );
    });
    
    // 編集中ノードも更新
    onEditingNodeChange?.(updatedNode);
  }, [setNodes, onEditingNodeChange]);

  const { handleRunAll } = useWorkflowExecution({
    nodes,
    connections: edges,
    nodeTypes: nodeDefinitions,
    setNodes,
    setExecutor,
    setExecutionState,
    setExecutionResult,
    setDebugLog,
    onSelectedNodeChange: onSelectedNodeChange,
    selectedNode: selectedNode,
    executor,
  });

  const onPaneContextMenu = useCallback(
    (event) => {
      event.preventDefault();
      // 画面座標とReactFlow座標の両方を保存
      const flowPosition = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setContextMenu({ 
        screenX: event.clientX, 
        screenY: event.clientY,
        flowX: flowPosition.x,
        flowY: flowPosition.y
      });
    },
    [screenToFlowPosition, setContextMenu]
  );

  // ノードクリック時の選択処理
  const onNodeClick = useCallback((event, node) => {
    event.stopPropagation();
    console.log('ノードが選択されました:', node);
    onSelectedNodeChange?.(node);
    setEditingNode(node); // プロパティパネルに表示
    onEditingNodeChange?.(node);
  }, [onSelectedNodeChange, setEditingNode, onEditingNodeChange]);
  
  // パネルクリック時の選択解除
  const onPaneClick = useCallback(() => {
    onSelectedNodeChange?.(null);
    setEditingNode(null); // プロパティパネルを閉じる
    onEditingNodeChange?.(null);
    setContextMenu(null);
  }, [onSelectedNodeChange, setEditingNode, onEditingNodeChange, setContextMenu]);
  
  // const onViewportChangeCallback = useCallback((newViewport) => {
  //   setViewport(newViewport);
  // }, [setViewport]);

  console.log('ReactFlowEditor return 前 - コンポーネントは正常に動作中');
  
  if (nodes.length === 0) {
    console.warn('ReactFlowEditor - nodesが空です');
  }
  
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <WorkflowToolbar
        currentWorkflow={currentWorkflow}
        workflows={workflows}
        onSave={handleWorkflowSave}
        onLoad={handleWorkflowLoad}
        onCreate={handleWorkflowCreate}
        onRename={handleWorkflowRename}
        onDelete={handleWorkflowDelete}
        onExport={handleWorkflowExport}
        onImport={handleWorkflowImport}
        onDuplicate={handleWorkflowDuplicate}
        hasUnsavedChanges={hasUnsavedChanges}
      />
      {console.log('ReactFlowコンポーネントをレンダリング中...')}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onPaneContextMenu={onPaneContextMenu}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        fitView={false}
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
      >
        <svg>
          <defs>
            <marker
              id="edge-circle"
              viewBox="-5 -5 10 10"
              refX="0"
              refY="0"
              markerWidth="20"
              markerHeight="20"
              orient="auto"
            >
              <circle stroke="#b1b1b7" strokeOpacity="0.75" r="2" cx="0" cy="0" />
            </marker>
          </defs>
        </svg>
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
      <ContextMenu />
      <div className="absolute top-2 right-2 z-10 space-x-2">
        <Button 
          onClick={() => setShowDebugLog(true)} 
          variant="outline"
          size="sm"
        >
          Show Output
        </Button>
        <Button onClick={handleRunAll} className="bg-green-600 hover:bg-green-700 text-white">Run Workflow</Button>
      </div>
      
      {/* 実行結果ウィンドウ */}
      <ExecutionOutputWindow 
        isOpen={showDebugLog}
        onClose={() => setShowDebugLog(false)}
        executionResult={executionResult}
        debugLog={debugLog}
        executionState={executionState}
      />
    </div>
  );
};

export default ReactFlowEditor;
