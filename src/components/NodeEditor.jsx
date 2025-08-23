import React, { useState, useRef, useCallback, useLayoutEffect, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'

import llmService from '../services/llmService.js'
import workflowManagerService from '../services/workflowManagerService.js'
import WorkflowHistoryView from './WorkflowHistoryView.jsx'
import WorkflowToolbar from './workflow/WorkflowToolbar.jsx'
import NodeCanvas from './workflow/NodeCanvas.jsx'
import useWorkflowExecution from '../hooks/useWorkflowExecution.js'
import useNodeInteraction from '../hooks/useNodeInteraction.js'
import { debounce } from '../lib/utils.js'
import { nodeTypes } from './nodes/index.js'

const NodeEditor = ({ selectedNode, onSelectedNodeChange, editingNode, onEditingNodeChange }) => {
  const [currentWorkflow, setCurrentWorkflow] = useState(null);
  const [nodes, setNodes] = useState([])
  const [connections, setConnections] = useState([])
  const [draggedNode, setDraggedNode] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionStart, setConnectionStart] = useState(null)
  const [executionResult, setExecutionResult] = useState(null)
  const [showDebugLog, setShowDebugLog] = useState(false)
  const [debugLog, setDebugLog] = useState([])
  const [contextMenu, setContextMenu] = useState(null)
  const [selectedConnection, setSelectedConnection] = useState(null)
  const [draggingLine, setDraggingLine] = useState(null)
  const [executor, setExecutor] = useState(null)
  const [executionState, setExecutionState] = useState({ running: false, currentNodeId: null, executedNodeIds: new Set() })
  const [connectionPaths, setConnectionPaths] = useState([]);
  const [isRenaming, setIsRenaming] = useState(false);
  const [workflows, setWorkflows] = useState([]);
  const [nodeResizing, setNodeResizing] = useState(null); // { nodeId, startSize, startMouse }
  const [showHistoryView, setShowHistoryView] = useState(false)

  const canvasRef = useRef(null)
  const portRefs = useRef(new Map())
  const renameInputRef = useRef(null);

  // ワークフロー実行フック
  const { handleRunAll, handleStepForward, handleResetExecution } = useWorkflowExecution({
    nodes,
    connections,
    nodeTypes,
    setNodes,
    setExecutor,
    setExecutionState,
    setExecutionResult,
    setDebugLog,
    onSelectedNodeChange,
    selectedNode,
    executor
  });

  // ノードインタラクションフック
  const {
    handleNodeMouseDown,
    handleResizeMouseDown,
    handleNodeClick,
    handlePortMouseDown,
    handleMouseMove,
    handleMouseUp,
    handlePortMouseUp
  } = useNodeInteraction({
    nodes,
    connections,
    setNodes,
    setConnections,
    setDraggedNode,
    setDragOffset,
    setIsConnecting,
    setConnectionStart,
    setDraggingLine,
    setNodeResizing,
    setSelectedConnection,
    onSelectedNodeChange,
    canvasRef,
    draggedNode,
    dragOffset,
    isConnecting,
    draggingLine,
    nodeResizing,
    connectionStart
  });

  // Initial load
  useEffect(() => {
    const workflowId = workflowManagerService.getCurrentWorkflowId();
    loadWorkflow(workflowId);
    setWorkflows(Object.values(workflowManagerService.getWorkflows()));
  }, []);

  const debouncedSave = useMemo(() => debounce((wf) => {
    if (wf) {
      workflowManagerService.saveWorkflow(wf);
      setWorkflows(Object.values(workflowManagerService.getWorkflows()));
    }
  }, 300), []); // 300msに短縮してレスポンス向上

  useEffect(() => {
    if (currentWorkflow) {
      const wfToSave = { ...currentWorkflow, nodes, connections };
      debouncedSave(wfToSave);
    }
  }, [nodes, connections, currentWorkflow, debouncedSave]);

  // Debug: connections配列の変更を監視
  useEffect(() => {
    console.log('NodeEditor connections changed:', connections.length, connections);
  }, [connections]);

  const loadWorkflow = (id) => {
    const wf = workflowManagerService.getWorkflow(id);
    if (wf) {
      setCurrentWorkflow(wf);
      setNodes(wf.nodes || []);
      setConnections(wf.connections || []);
      workflowManagerService.setCurrentWorkflowId(id);
    }
  };

  const handleNewWorkflow = () => {
    const newWf = workflowManagerService.createNewWorkflow();
    workflowManagerService.saveWorkflow(newWf);
    loadWorkflow(newWf.id);
    setWorkflows(Object.values(workflowManagerService.getWorkflows()));
  };

  const handleRenameWorkflow = (newName) => {
    if (currentWorkflow && newName) {
      setCurrentWorkflow(prev => ({...prev, name: newName}));
    }
    setIsRenaming(false);
  };

  const handleDeleteWorkflow = (id) => {
    if (window.confirm('本当にこのワークフローを削除しますか？')) {
      workflowManagerService.deleteWorkflow(id);
      const newCurrentId = workflowManagerService.getCurrentWorkflowId();
      loadWorkflow(newCurrentId);
      setWorkflows(Object.values(workflowManagerService.getWorkflows()));
    }
  };

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  useEffect(() => {
    if (selectedNode) {
      onEditingNodeChange({ ...selectedNode });
    } else {
      onEditingNodeChange(null);
    }
  }, [selectedNode, onEditingNodeChange]);

  // editingNodeの変更をnodesに反映
  useEffect(() => {
    if (editingNode && selectedNode && editingNode.id === selectedNode.id) {
      setNodes(prev => prev.map(node => 
        node.id === editingNode.id ? editingNode : node
      ));
    }
  }, [editingNode, selectedNode]);

  const connectionPathsCalculation = useCallback(() => {
    return connections.map((conn) => {
      const fromNode = nodes.find(n => n.id === conn.from.nodeId)
      const toNode = nodes.find(n => n.id === conn.to.nodeId)
      if (!fromNode || !toNode) return null

      const fromPortEl = portRefs.current.get(`${conn.from.nodeId}-output-${conn.from.portIndex}`)
      const toPortEl = portRefs.current.get(`${conn.to.nodeId}-input-${conn.to.portIndex}`)
      const canvasEl = canvasRef.current

      if (!fromPortEl || !toPortEl || !canvasEl) {
        console.log('DOM elements missing:', {
          fromPortKey: `${conn.from.nodeId}-output-${conn.from.portIndex}`,
          toPortKey: `${conn.to.nodeId}-input-${conn.to.portIndex}`,
          fromPortEl: !!fromPortEl,
          toPortEl: !!toPortEl,
          canvasEl: !!canvasEl
        });
        // DOM要素が見つからない場合は少し待ってからリトライ
        setTimeout(() => {
          const retryPaths = connectionPathsCalculation();
          setConnectionPaths(retryPaths);
        }, 50);
        return null;
      }

      const canvasRect = canvasEl.getBoundingClientRect()
      const fromPortRect = fromPortEl.getBoundingClientRect()
      const toPortRect = toPortEl.getBoundingClientRect()

      const fromX = fromPortRect.right - canvasRect.left
      const fromY = fromPortRect.top - canvasRect.top + fromPortRect.height / 2
      const toX = toPortRect.left - canvasRect.left
      const toY = toPortRect.top - canvasRect.top + toPortRect.height / 2

      const isLoop = fromNode.id === toNode.id
      const pathData = isLoop
        ? `M ${fromX} ${fromY} C ${fromX + 60} ${fromY - 60}, ${toX - 60} ${toY - 60}, ${toX} ${toY}`
        : `M ${fromX} ${fromY} C ${fromX + Math.abs(toX - fromX) * 0.4} ${fromY}, ${toX - Math.abs(toX - fromX) * 0.4} ${toY}, ${toX} ${toY}`

      const fromPortName = nodeTypes[fromNode.type].outputs[conn.from.portIndex]
      let strokeColor = '#3b82f6'
      if (fromPortName === 'true') strokeColor = '#10b981'
      else if (fromPortName === 'false') strokeColor = '#ef4444'
      else if (fromPortName === 'loop') strokeColor = '#8b5cf6'

      return { id: conn.id, pathData, strokeColor, fromPortName, fromX, fromY };
    }).filter(Boolean);
  }, [nodes, connections]); // nodeTypesは外部定数のため依存配列から除外

  const memoizedConnectionPaths = useMemo(() => {
    return connectionPathsCalculation();
  }, [connectionPathsCalculation]);

  useLayoutEffect(() => {
    setConnectionPaths(memoizedConnectionPaths);
  }, [memoizedConnectionPaths, selectedConnection]);

  // ノード位置変更時の接続線強制リフレッシュ
  useLayoutEffect(() => {
    if (draggedNode) {
      // ドラッグ中は頻繁な再計算を避ける
      return;
    }
    // 短い遅延後に接続線を再計算（DOM更新完了を待つ）
    const timer = setTimeout(() => {
      const refreshedPaths = connectionPathsCalculation();
      setConnectionPaths(refreshedPaths);
    }, 16); // 1フレーム待機
    
    return () => clearTimeout(timer);
  }, [nodes, connectionPathsCalculation, draggedNode]);

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedConnection) {
        e.preventDefault()
        setConnections(prev => prev.filter(c => c.id !== selectedConnection))
        setSelectedConnection(null)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedConnection])

  // ウィンドウリサイズ時の接続線更新
  React.useEffect(() => {
    const handleResize = () => {
      // リサイズ後に接続線を再計算
      setTimeout(() => {
        const refreshedPaths = connectionPathsCalculation();
        setConnectionPaths(refreshedPaths);
      }, 100);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [connectionPathsCalculation]);



  const handleCanvasRightClick = (e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    setContextMenu({ x: e.clientX, y: e.clientY, canvasX: e.clientX - rect.left, canvasY: e.clientY - rect.top });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const addNodeFromContext = (nodeType) => {
    if (contextMenu) {
      addNode(nodeType, contextMenu.canvasX, contextMenu.canvasY);
      closeContextMenu();
    }
  };

  const addNode = (type, x = null, y = null) => {
    const nodeType = nodeTypes[type];
    if (!nodeType) return;

    let defaultData = { ...nodeType.defaultData };
    if (type === 'llm' || type === 'if') {
      const currentSettings = llmService.loadSettings();
      defaultData.model = currentSettings.model;
      defaultData.temperature = currentSettings.temperature;
      defaultData.provider = currentSettings.provider; // プロバイダーも追加
    }

    const newNode = {
      id: `${type}_${Date.now()}`,
      type,
      position: { x: x !== null ? x : 100 + Math.random() * 200, y: y !== null ? y : 100 + Math.random() * 200 },
      size: { 
        width: type === 'input' || type === 'output' ? 180 : 
               type === 'llm' ? 320 : 160,
        height: type === 'input' || type === 'output' ? 168 : // 140 * 1.2
                type === 'llm' ? 240 : // 120 * 2
                type === 'text_combiner' ? 210 : // 220 - 10
                type === 'if' ? 180 : // 240 - 60
                type === 'while' ? 220 : // 240 - 20
                type === 'variable_set' ? 145 : // 120 + 25
                120
      }, // カスタマイズサイズ
      data: { label: nodeType.name, ...defaultData }
    };
    setNodes(prev => [...prev, newNode]);
  };;;;



  const exportWorkflow = () => {
    if (!currentWorkflow) return;
    const dataStr = JSON.stringify({ ...currentWorkflow, nodes, connections }, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentWorkflow.name}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importWorkflow = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const wf = JSON.parse(e.target.result);
          if (wf.nodes && wf.connections && wf.id && wf.name) {
            workflowManagerService.saveWorkflow(wf);
            loadWorkflow(wf.id);
            setWorkflows(Object.values(workflowManagerService.getWorkflows()));
            alert('ワークフローをインポートしました');
          } else {
            alert('無効なワークフローファイルです');
          }
        } catch {
          alert('ファイルの読み込みに失敗しました');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const deleteNode = (nodeId) => {
    setNodes(prev => prev.filter(node => node.id !== nodeId));
    setConnections(prev => prev.filter(conn => conn.from.nodeId !== nodeId && conn.to.nodeId !== nodeId));
    if (selectedNode?.id === nodeId) {
      onSelectedNodeChange(null);
    }
  };

  const handleNodeValueChange = useCallback((nodeId, newValue) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId 
        ? { ...node, data: { ...node.data, value: newValue } }
        : node
    ));
  }, []);
  const handleSystemPromptChange = useCallback((nodeId, newValue) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId 
        ? { ...node, data: { ...node.data, systemPrompt: newValue } }
        : node
    ));
  }, []);


  return (
    <div className="flex h-full bg-gray-50">
      <div className="flex-1 relative">
        <WorkflowToolbar
          currentWorkflow={currentWorkflow}
          workflows={workflows}
          isRenaming={isRenaming}
          setIsRenaming={setIsRenaming}
          renameInputRef={renameInputRef}
          onNewWorkflow={handleNewWorkflow}
          onRenameWorkflow={handleRenameWorkflow}
          onDeleteWorkflow={handleDeleteWorkflow}
          onLoadWorkflow={loadWorkflow}
          onImportWorkflow={importWorkflow}
          onExportWorkflow={exportWorkflow}
          onRunAll={handleRunAll}
          onStepForward={handleStepForward}
          onResetExecution={handleResetExecution}
          onToggleHistory={() => setShowHistoryView(!showHistoryView)}
          showHistoryView={showHistoryView}
          executionState={executionState}
          executor={executor}
          executionResult={executionResult}
          debugLog={debugLog}
        />
        <NodeCanvas
          ref={canvasRef}
          nodes={nodes}
          connections={connections}
          nodeTypes={nodeTypes}
          selectedNode={selectedNode}
          selectedConnection={selectedConnection}
          setSelectedConnection={setSelectedConnection}
          connectionPaths={connectionPaths}
          draggingLine={draggingLine}
          isConnecting={isConnecting}
          connectionStart={connectionStart}
          executionState={executionState}
          contextMenu={contextMenu}
          portRefs={portRefs}
          onNodeMouseDown={handleNodeMouseDown}
          onNodeClick={handleNodeClick}
          onNodeDelete={deleteNode}
          onPortMouseDown={handlePortMouseDown}
          onPortMouseUp={handlePortMouseUp}
          onNodeValueChange={handleNodeValueChange}
          onSystemPromptChange={handleSystemPromptChange}
          onResizeMouseDown={handleResizeMouseDown}
          onCanvasClick={() => { closeContextMenu(); onSelectedNodeChange(null); setSelectedConnection(null) }}
          onCanvasRightClick={handleCanvasRightClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onAddNodeFromContext={addNodeFromContext}
          draggedNode={draggedNode}
        />
      </div>
      <div className="w-80 bg-white border-l overflow-y-auto">
        {showHistoryView ? (
          <div className="p-4">
            <WorkflowHistoryView workflowId={currentWorkflow?.id || 'default'} />
          </div>
        ) : (
          <>
            {/* This panel is now empty, it will be moved to Layout.jsx */}
          </>
        )}

         {executionResult && !showHistoryView && (
          <div className="p-4 border-t">
            <div className="space-y-2">
              <div className="flex items-center justify-between"><h4 className="font-medium text-sm">実行結果</h4><button onClick={() => setShowDebugLog(!showDebugLog)} className="text-xs text-blue-600 hover:text-blue-800 underline">{showDebugLog ? 'ログを隠す' : 'デバッグログ'}</button></div>
              {executionResult.success ? (
                <div className="text-xs bg-green-50 border border-green-200 rounded p-2">
                  <div className="text-green-800 font-medium">実行成功</div>
                  {executionResult.outputs && Object.keys(executionResult.outputs).length > 0 && (
                    <div className="mt-2">
                      <div className="text-green-700 font-medium">出力結果:</div>
                      {Object.entries(executionResult.outputs).map(([key, value]) => (
                        <div key={key} className="mt-1 p-2 bg-white border rounded">
                          <div className="text-green-800 font-medium text-xs">{key}:</div>
                          <pre className="text-green-600 whitespace-pre-wrap text-xs mt-1">{String(value)}</pre>
                        </div>
                      ))}
                    </div>
                  )}
                  {executionResult.variables && Object.keys(executionResult.variables).length > 0 && (
                    <div className="mt-2">
                      <div className="text-green-700 font-medium">入力変数:</div>
                      <pre className="text-green-600 whitespace-pre-wrap text-xs">{JSON.stringify(executionResult.variables, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs bg-red-50 border border-red-200 rounded p-2">
                  <div className="text-red-800 font-medium">実行エラー</div>
                  <div className="text-red-600 mt-1">{executionResult.error}</div>
                </div>
              )}
              {showDebugLog && debugLog.length > 0 && (
                <div className="mt-3 border-t pt-3">
                  <h5 className="font-medium text-xs text-gray-700 mb-2">デバッグログ</h5>
                  <div className="max-h-120 overflow-y-auto bg-gray-50 border rounded p-2 space-y-1">
                    {debugLog.map((log, index) => (
                      <div key={index} className="text-xs">
                        <div className="flex items-start space-x-2">
                          <span className={`inline-block w-2 h-2 rounded-full mt-1 flex-shrink-0 ${log.level === 'error' ? 'bg-red-500' : log.level === 'success' ? 'bg-green-500' : log.level === 'info' ? 'bg-blue-500' : 'bg-gray-500'}`}></span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2"><span className="text-gray-500 text-xs">{new Date(log.timestamp).toLocaleTimeString()}</span><span className={`font-medium text-xs ${log.level === 'error' ? 'text-red-700' : log.level === 'success' ? 'text-green-700' : log.level === 'info' ? 'text-blue-700' : 'text-gray-700'}`}>[{log.level.toUpperCase()}]</span>{log.nodeId && (<span className="text-purple-600 text-xs bg-purple-100 px-1 rounded">{log.nodeId}</span>)}</div>
                            <div className="text-gray-800 mt-1">{log.message}</div>
                            {log.data && (<details className="mt-1"><summary className="text-gray-600 cursor-pointer text-xs">詳細データ</summary><pre className="text-xs text-gray-600 mt-1 whitespace-pre-wrap bg-white p-1 rounded border">{JSON.stringify(log.data, null, 2)}</pre></details>)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default NodeEditor;
