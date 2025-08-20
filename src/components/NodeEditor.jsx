import React, { useState, useRef, useCallback, useLayoutEffect, useMemo, useEffect } from 'react'
import { Plus, Play, Save, Download, Upload, Trash2, Square, FileUp, StepForward, RotateCcw, MoreHorizontal, FilePlus, FolderOpen, Trash, Edit, Check } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Alert, AlertDescription, AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog.jsx'
import { Progress } from '@/components/ui/progress.jsx'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu.jsx'
import { Input } from '@/components/ui/input.jsx'
import nodeExecutionService from '../services/nodeExecutionService.js'
import llmService from '../services/llmService.js'
import workflowManagerService from '../services/workflowManagerService.js'
import { debounce } from '../lib/utils.js'

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

  const canvasRef = useRef(null)
  const nodeRefs = useRef(new Map())
  const portRefs = useRef(new Map())
  const renameInputRef = useRef(null);

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
  }, 1000), []);

  useEffect(() => {
    if (currentWorkflow) {
      const wfToSave = { ...currentWorkflow, nodes, connections };
      debouncedSave(wfToSave);
    }
  }, [nodes, connections, currentWorkflow?.name, debouncedSave]);

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
  }, [selectedNode?.id, onEditingNodeChange]);

  useLayoutEffect(() => {
    const newConnectionPaths = connections.map((conn) => {
      const fromNode = nodes.find(n => n.id === conn.from.nodeId)
      const toNode = nodes.find(n => n.id === conn.to.nodeId)
      if (!fromNode || !toNode) return null

      const fromPortEl = portRefs.current.get(`${conn.from.nodeId}-output-${conn.from.portIndex}`)
      const toPortEl = portRefs.current.get(`${conn.to.nodeId}-input-${conn.to.portIndex}`)
      const canvasEl = canvasRef.current

      if (!fromPortEl || !toPortEl || !canvasEl) return null

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

    setConnectionPaths(newConnectionPaths);
  }, [nodes, connections, selectedConnection]);

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

  const nodeTypes = {
    input: { name: '入力', icon: '📥', color: 'bg-gradient-to-br from-orange-400 to-orange-600', borderColor: 'border-orange-300', textColor: 'text-white', inputs: [], outputs: ['output'], defaultData: { value: '', inputType: 'text' } },
    text_combiner: { name: 'テキスト結合', icon: '🔗', color: 'bg-gradient-to-br from-teal-400 to-teal-600', borderColor: 'border-teal-300', textColor: 'text-white', inputs: ['input1', 'input2', 'input3', 'input4'], outputs: ['output'], defaultData: {} },
    llm: { name: 'LLM生成', icon: '🤖', color: 'bg-gradient-to-br from-blue-400 to-blue-600', borderColor: 'border-blue-300', textColor: 'text-white', inputs: ['input'], outputs: ['output'], defaultData: { prompt: 'あなたは優秀なアシスタントです。以下の入力に対して適切に回答してください。\n\n入力: {{input}}', temperature: 1.0, model: 'gpt-5-nano' } },
    if: { name: 'If条件分岐', icon: '🔀', color: 'bg-gradient-to-br from-pink-400 to-pink-600', borderColor: 'border-pink-300', textColor: 'text-white', inputs: ['input'], outputs: ['true', 'false'], defaultData: { conditionType: 'llm', condition: '入力が肯定的な内容かどうか判断してください', variable: '', operator: '==', value: '', model: 'gpt-5-nano', temperature: 0.7 } },
    while: { name: 'While繰り返し', icon: '🔄', color: 'bg-gradient-to-br from-purple-400 to-purple-600', borderColor: 'border-purple-300', textColor: 'text-white', inputs: ['input', 'loop'], outputs: ['output', 'loop'], defaultData: { conditionType: 'variable', condition: '', variable: 'counter', operator: '<', value: '10', maxIterations: 100 } },
    output: { name: '出力', icon: '📤', color: 'bg-gradient-to-br from-green-400 to-green-600', borderColor: 'border-green-300', textColor: 'text-white', inputs: ['input'], outputs: [], defaultData: { format: 'text', title: '結果', result: '' } }
  }

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
    }

    const newNode = {
      id: `${type}_${Date.now()}`,
      type,
      position: { x: x !== null ? x : 100 + Math.random() * 200, y: y !== null ? y : 100 + Math.random() * 200 },
      data: { label: nodeType.name, ...defaultData }
    };
    setNodes(prev => [...prev, newNode]);
  };

  const updateNodePosition = (nodeId, position) => {
    setNodes(prev => prev.map(node => node.id === nodeId ? { ...node, position } : node));
  };

  const handleNodeMouseDown = (e, node) => {
    if (e.target.classList.contains('port')) return;
    setDraggedNode(node);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({ x: e.clientX - rect.left - node.position.x, y: e.clientY - rect.top - node.position.y });
    }
  };

  const handleNodeClick = (e, node) => {
    e.stopPropagation();
    onSelectedNodeChange(node);
    setSelectedConnection(null);
  };

  const handlePortMouseDown = (e, nodeId, portIndex, isOutput) => {
    e.stopPropagation();
    if (!isOutput) return;
    const fromNode = nodes.find(n => n.id === nodeId);
    if (!fromNode) return;
    const rect = e.target.getBoundingClientRect();
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const startX = rect.left + rect.width / 2 - canvasRect.left;
    const startY = rect.top + rect.height / 2 - canvasRect.top;
    setIsConnecting(true);
    setConnectionStart({ nodeId, portIndex });
    setDraggingLine({ startX, startY, endX: startX, endY: startY });
  };

  const handleMouseMove = useCallback((e) => {
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - canvasRect.left;
    const mouseY = e.clientY - canvasRect.top;
    if (draggedNode) {
      const newPosition = { x: mouseX - dragOffset.x, y: mouseY - dragOffset.y };
      updateNodePosition(draggedNode.id, newPosition);
    }
    if (isConnecting && draggingLine) {
      setDraggingLine(prev => ({ ...prev, endX: mouseX, endY: mouseY }));
    }
  }, [draggedNode, dragOffset, isConnecting, draggingLine]);

  const handleMouseUp = () => {
    if (draggedNode) setDraggedNode(null);
    if (isConnecting) {
      setIsConnecting(false);
      setConnectionStart(null);
      setDraggingLine(null);
    }
  };

  const handlePortMouseUp = (e, nodeId, portIndex, isOutput) => {
    if (isOutput || !isConnecting || !connectionStart) return;
    if (connectionStart.nodeId === nodeId) return;
    if (connections.some(conn => conn.to.nodeId === nodeId && conn.to.portIndex === portIndex)) {
      console.log("Input port is already connected.");
      return;
    }
    const newConnection = { id: `conn_${Date.now()}`, from: connectionStart, to: { nodeId, portIndex } };
    setConnections(prev => [...prev, newConnection]);
    setIsConnecting(false);
    setConnectionStart(null);
    setDraggingLine(null);
  };

  const processExecutionCompletion = () => {
    const finalContext = nodeExecutionService.executionContext;
    let newSelectedNode = null;

    setNodes(prevNodes => {
      const newNodes = prevNodes.map(node => {
        if (node.type === 'output' && finalContext[node.id] !== undefined) {
          const updatedNode = { ...node, data: { ...node.data, result: String(finalContext[node.id]) } };
          if (selectedNode && selectedNode.id === node.id) newSelectedNode = updatedNode;
          return updatedNode;
        }
        return node;
      });
      return newNodes;
    });

    if (newSelectedNode) onSelectedNodeChange(newSelectedNode);
    setDebugLog(nodeExecutionService.getExecutionLog());
  };

  const handleRunAll = async () => {
    if (nodes.length === 0) return alert('実行するノードがありません');
    const inputNodes = nodes.filter(n => n.type === 'input');
    const inputData = Object.fromEntries(inputNodes.map(n => [n.id, n.data.value || '']));
    const exec = nodeExecutionService.startExecution(nodes, connections, inputData, nodeTypes);
    setExecutor(exec);
    setExecutionState({ running: true, currentNodeId: null, executedNodeIds: new Set() });
    setExecutionResult(null);
    setDebugLog([]);
    nodeExecutionService.setDebugMode(true);

    try {
      let result;
      do {
        result = await exec.next();
        if (!result.done) {
          setExecutionState(prev => ({ ...prev, currentNodeId: result.value.currentNodeId, executedNodeIds: new Set(prev.executedNodeIds).add(result.value.currentNodeId) }));
        }
      } while (!result.done);
      const finalState = result.value;
      if (finalState.status === 'completed') {
        setExecutionResult({ success: true, variables: finalState.variables });
      } else {
        setExecutionResult({ success: false, error: finalState.error?.message || 'Unknown error' });
      }
    } catch (error) {
      console.error("Workflow execution failed:", error);
      setExecutionResult({ success: false, error: error.message });
    } finally {
      processExecutionCompletion();
      setExecutionState({ running: false, currentNodeId: null, executedNodeIds: new Set() });
      setExecutor(null);
    }
  };

  const handleStepForward = async () => {
    let currentExecutor = executor;
    try {
      if (!currentExecutor) {
        const inputNodes = nodes.filter(n => n.type === 'input');
        const inputData = Object.fromEntries(inputNodes.map(n => [n.id, n.data.value || '']));
        currentExecutor = nodeExecutionService.startExecution(nodes, connections, inputData);
        setExecutor(currentExecutor);
        setExecutionState({ running: true, currentNodeId: null, executedNodeIds: new Set() });
        alert("ステップ実行を開始します。もう一度「ステップ」を押して最初のノードを実行してください。");
        return;
      }
      const result = await currentExecutor.next();
      if (result.done) {
        if (result.value.status === 'completed') {
          alert('ワークフローの実行が完了しました。');
          setExecutionResult({ success: true, variables: result.value.variables });
        } else if (result.value.status === 'error') {
          alert(`エラーが発生しました: ${result.value.error?.message}`);
          setExecutionResult({ success: false, error: result.value.error?.message });
        }
        processExecutionCompletion();
        handleResetExecution();
      } else {
        setExecutionState(prev => ({ ...prev, currentNodeId: result.value.currentNodeId, executedNodeIds: new Set(prev.executedNodeIds).add(result.value.currentNodeId) }));
      }
    } catch (error) {
      console.error("Step forward failed:", error);
      setExecutionResult({ success: false, error: error.message });
      handleResetExecution();
    }
  };

  const handleResetExecution = () => {
    if (executor) executor.stop();
    setExecutor(null);
    setExecutionState({ running: false, currentNodeId: null, executedNodeIds: new Set() });
    setExecutionResult(null);
    setDebugLog([]);
  };

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
        } catch (err) {
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

  const renderNode = (node) => {
    const nodeType = nodeTypes[node.type];
    if (!nodeType) return null;
    const isSelected = selectedNode?.id === node.id;
    const isRunning = executionState.currentNodeId === node.id;
    const isExecuted = executionState.executedNodeIds.has(node.id);
    let borderClass = 'border-gray-300';
    if (isRunning) borderClass = 'border-blue-500 ring-4 ring-blue-300';
    else if (isExecuted) borderClass = 'border-green-500';
    if (isSelected) borderClass = `${nodeType.borderColor} border-4 shadow-2xl`;

    return (
      <div key={node.id} ref={(el) => { if (el) nodeRefs.current.set(node.id, el); else nodeRefs.current.delete(node.id); }}
        className={`absolute bg-white border-2 rounded-lg shadow-lg cursor-move min-w-40 transition-all duration-200 hover:shadow-xl ${borderClass}`}
        style={{ left: node.position.x, top: node.position.y, zIndex: isSelected ? 10 : 1, transform: isSelected ? 'scale(1.02)' : 'scale(1)' }}
        onMouseDown={(e) => handleNodeMouseDown(e, node)} onClick={(e) => handleNodeClick(e, node)} >
        <div className={`${nodeType.color} ${nodeType.textColor} px-3 py-2 rounded-t-md flex items-center justify-between`}>
          <div className="flex items-center space-x-2"><span className="text-lg">{nodeType.icon}</span><span className="text-sm font-medium truncate max-w-24">{node.data.label}</span></div>
          <button onClick={(e) => { e.stopPropagation(); deleteNode(node.id) }} className="text-white hover:text-red-200 ml-2 opacity-70 hover:opacity-100 transition-opacity"><Trash2 className="h-3 w-3" /></button>
        </div>
        <div className="p-3 space-y-2">
          {nodeType.inputs.map((inputName, index) => (
            <div key={`input-${index}`} className="flex items-center">
              <div ref={el => { const key = `${node.id}-input-${index}`; if (el) portRefs.current.set(key, el); else portRefs.current.delete(key); }}
                className={`port w-4 h-4 rounded-full cursor-pointer transition-all duration-200 mr-2 ${isConnecting ? 'bg-green-400 hover:bg-green-500 shadow-lg' : 'bg-gray-400 hover:bg-gray-600'}`} onMouseUp={(e) => handlePortMouseUp(e, node.id, index, false)} title={`入力: ${inputName}`} />
              <span className="text-xs text-gray-600 font-medium">{inputName}</span>
            </div>
          ))}
          <div className="text-xs text-gray-700 bg-gray-50 p-2 rounded border">
            {node.type === 'input' && <div className="truncate">{node.data.value || '入力値を設定...'}</div>}
            {node.type === 'llm' && <div className="truncate">プロンプト: {node.data.prompt?.substring(0, 30)}...</div>}
            {node.type === 'if' && <div className="truncate">条件: {node.data.condition?.substring(0, 30)}...</div>}
            {node.type === 'while' && <div className="truncate">繰り返し: {node.data.variable} {node.data.operator} {node.data.value}</div>}
            {node.type === 'output' && <textarea className="w-full h-12 text-xs bg-transparent border-none focus:ring-0 resize-none" readOnly value={String(node.data.result || '')} placeholder="実行結果..." />}
          </div>
          {nodeType.outputs.map((outputName, index) => (
            <div key={`output-${index}`} className="flex items-center justify-end">
              <span className="text-xs text-gray-600 font-medium mr-2">{outputName}</span>
              <div ref={el => { const key = `${node.id}-output-${index}`; if (el) portRefs.current.set(key, el); else portRefs.current.delete(key); }}
                className={`port w-4 h-4 rounded-full cursor-pointer transition-all duration-200 ${isConnecting && connectionStart?.nodeId === node.id && connectionStart?.portIndex === index ? 'bg-blue-600 ring-2 ring-blue-400' : 'bg-gray-400 hover:bg-blue-500'}`} onMouseDown={(e) => handlePortMouseDown(e, node.id, index, true)} title={`出力: ${outputName}`} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderConnections = () => {
    return connectionPaths.map((path, index) => {
      const { id, pathData, strokeColor, fromPortName, fromX, fromY } = path;
      const isSelected = selectedConnection === id;
      return (
        <svg key={id || index} className="absolute z-10" style={{ left: 0, top: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
          <defs>
            <linearGradient id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor={strokeColor} stopOpacity={0.8} /><stop offset="100%" stopColor={strokeColor} stopOpacity={0.48} /></linearGradient>
            <filter id={`glow-${index}`}><feGaussianBlur stdDeviation="3.5" result="coloredBlur" /><feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <marker id={`arrowhead-${index}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill={strokeColor} /></marker>
            <marker id="arrowhead-selected" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#e11d48" /></marker>
          </defs>
          <g className="cursor-pointer" onClick={(e) => { e.stopPropagation(); setSelectedConnection(id); }} style={{ pointerEvents: 'all' }}>
            <path d={pathData} stroke="transparent" strokeWidth="20" fill="none" />
            <path d={pathData} stroke={isSelected ? '#e11d48' : `url(#gradient-${index})`} strokeWidth={isSelected ? 4 : 3} fill="none" filter={isSelected ? 'url(#glow-selected)' : `url(#glow-${index})`} markerEnd={isSelected ? 'url(#arrowhead-selected)' : `url(#arrowhead-${index})`} className="transition-all duration-200" />
            {!isSelected && (<circle r="4" fill={strokeColor} className="opacity-80"><animateMotion dur="2s" repeatCount="indefinite" path={pathData} /></circle>)}
          </g>
          {fromPortName !== 'output' && (<text x={fromX + 5} y={fromY - 8} className="text-xs font-medium fill-gray-600" textAnchor="start" style={{ pointerEvents: 'none' }}>{fromPortName}</text>)}
        </svg>
      )
    })
  }

  const renderDraggingLine = () => {
    if (!draggingLine) return null;
    const { startX, startY, endX, endY } = draggingLine;
    const pathData = `M ${startX} ${startY} C ${(startX + endX) / 2} ${startY}, ${(startX + endX) / 2} ${endY}, ${endX} ${endY}`;
    return (
      <svg className="absolute pointer-events-none z-50" style={{ left: 0, top: 0, width: '100%', height: '100%', overflow: 'visible' }}>
        <path d={pathData} stroke="#e11d48" strokeWidth="3" fill="none" filter="url(#glow-selected)" markerEnd="url(#arrowhead-selected)" />
      </svg>
    );
  };

  return (
    <div className="flex h-full bg-gray-50">
      <div className="flex-1 relative">
        <div className="absolute top-4 left-4 z-30 bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-2 flex items-center gap-2 border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="flex gap-2"><FolderOpen className="h-4 w-4" /><span>ワークフロー</span></Button></DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={handleNewWorkflow}><FilePlus className="mr-2 h-4 w-4" />新規作成</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>開く</DropdownMenuLabel>
              {workflows.map(wf => (<DropdownMenuItem key={wf.id} onSelect={() => loadWorkflow(wf.id)}>{wf.name}</DropdownMenuItem>))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={importWorkflow}><Upload className="mr-2 h-4 w-4" />インポート</DropdownMenuItem>
              <DropdownMenuItem onSelect={exportWorkflow}><Download className="mr-2 h-4 w-4" />エクスポート</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {isRenaming ? (
            <Input ref={renameInputRef} type="text" defaultValue={currentWorkflow?.name} onBlur={(e) => handleRenameWorkflow(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleRenameWorkflow(e.target.value)} className="h-8 w-48"/>
          ) : (
            <span className="text-sm font-semibold px-2">{currentWorkflow?.name}</span>
          )}
          <Button variant="ghost" size="icon" onClick={() => setIsRenaming(true)} className="h-8 w-8"><Edit className="h-4 w-4" /></Button>

          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600"><Trash className="h-4 w-4" /></Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>本当に削除しますか？</AlertDialogTitle><AlertDialogDescription>この操作は元に戻せません。「{currentWorkflow?.name}」は完全に削除されます。</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>キャンセル</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteWorkflow(currentWorkflow.id)}>削除</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="w-px h-6 bg-gray-200 mx-2" />

          <Button onClick={handleRunAll} disabled={executionState.running} size="sm" className="gap-1.5 bg-green-500 hover:bg-green-600 text-white"><Play className="h-4 w-4" />すべて実行</Button>
          <Button onClick={handleStepForward} disabled={executionState.running && executor} size="sm" variant="outline" className="gap-1.5"><StepForward className="h-4 w-4" />ステップ</Button>
          <Button onClick={handleResetExecution} disabled={!executionState.running} size="sm" variant="destructive" className="gap-1.5"><RotateCcw className="h-4 w-4" />リセット</Button>
        </div>
        <div ref={canvasRef} className="w-full h-full relative cursor-crosshair" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onContextMenu={handleCanvasRightClick} onClick={(e) => { closeContextMenu(); onSelectedNodeChange(null); setSelectedConnection(null) }} style={{ backgroundImage: 'radial-gradient(circle, #ccc 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          {renderConnections()}
          {renderDraggingLine()}
          {nodes.map(renderNode)}
          {contextMenu && (
            <div className="fixed bg-white rounded-lg shadow-lg border py-2 z-50 min-w-48" style={{ left: contextMenu.x, top: contextMenu.y }}>
              <div className="px-3 py-1 text-xs text-gray-500 border-b mb-1">ノードを追加</div>
              {Object.entries(nodeTypes).map(([type, config]) => (<button key={type} onClick={() => addNodeFromContext(type)} className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center space-x-2 transition-colors"><span className="text-lg">{config.icon}</span><span className="text-sm">{config.name}</span></button>))}
            </div>
          )}
        </div>
      </div>
      <div className="w-80 bg-white border-l overflow-y-auto">
        {/* This panel is now empty, it will be moved to Layout.jsx */}
        {!editingNode && (
            <div className="p-4"><div className="text-center text-gray-500 py-8"><div className="text-4xl mb-2">🎯</div><div className="text-sm">ノードを選択してください</div><div className="text-xs mt-1">右クリックでノードを追加できます</div></div></div>
        )}
         {executionResult && (
          <div className="p-4 border-t">
            <div className="space-y-2">
              <div className="flex items-center justify-between"><h4 className="font-medium text-sm">実行結果</h4><button onClick={() => setShowDebugLog(!showDebugLog)} className="text-xs text-blue-600 hover:text-blue-800 underline">{showDebugLog ? 'ログを隠す' : 'デバッグログ'}</button></div>
              {executionResult.success ? (<div className="text-xs bg-green-50 border border-green-200 rounded p-2"><div className="text-green-800 font-medium">実行成功</div>{executionResult.variables && Object.keys(executionResult.variables).length > 0 && (<div className="mt-2"><div className="text-green-700">変数:</div><pre className="text-green-600 whitespace-pre-wrap">{JSON.stringify(executionResult.variables, null, 2)}</pre></div>)}</div>) : (<div className="text-xs bg-red-50 border border-red-200 rounded p-2"><div className="text-red-800 font-medium">実行エラー</div><div className="text-red-600 mt-1">{executionResult.error}</div></div>)}
              {showDebugLog && debugLog.length > 0 && (
                <div className="mt-3 border-t pt-3">
                  <h5 className="font-medium text-xs text-gray-700 mb-2">デバッグログ</h5>
                  <div className="max-h-60 overflow-y-auto bg-gray-50 border rounded p-2 space-y-1">
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
