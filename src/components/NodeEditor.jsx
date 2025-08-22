import React, { useState, useRef, useCallback, useLayoutEffect, useMemo, useEffect } from 'react'
import { Plus, Play, Save, Download, Upload, Trash2, Square, FileUp, StepForward, RotateCcw, MoreHorizontal, FilePlus, FolderOpen, Trash, Edit, Check, History } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog.jsx'
import { Progress } from '@/components/ui/progress.jsx'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu.jsx'
import { Input } from '@/components/ui/input.jsx'
import nodeExecutionService from '../services/nodeExecutionService.js'
import llmService from '../services/llmService.js'
import workflowManagerService from '../services/workflowManagerService.js'
import WorkflowHistoryView from './WorkflowHistoryView.jsx'
import { debounce } from '../lib/utils.js'

// nodeTypes定義をコンポーネント外に移動
const nodeTypes = {
  input: { name: '入力', icon: '📥', color: 'bg-gradient-to-br from-orange-400 to-orange-600', borderColor: 'border-orange-300', textColor: 'text-white', inputs: [], outputs: ['output'], defaultData: { value: '', inputType: 'text' } },
  text_combiner: { name: 'テキスト結合', icon: '🔗', color: 'bg-gradient-to-br from-teal-400 to-teal-600', borderColor: 'border-teal-300', textColor: 'text-white', inputs: ['input1', 'input2', 'input3', 'input4'], outputs: ['output'], defaultData: {} },
  llm: { name: 'LLM生成', icon: '🤖', color: 'bg-gradient-to-br from-blue-400 to-blue-600', borderColor: 'border-blue-300', textColor: 'text-white', inputs: ['input'], outputs: ['output'], defaultData: { temperature: 1.0, model: 'gpt-5-nano', systemPrompt: '' } },
  if: { name: 'If条件分岐', icon: '🔀', color: 'bg-gradient-to-br from-pink-400 to-pink-600', borderColor: 'border-pink-300', textColor: 'text-white', inputs: ['input'], outputs: ['true', 'false'], defaultData: { conditionType: 'llm', condition: '入力が肯定的な内容かどうか判断してください', variable: '', operator: '==', value: '', model: 'gpt-5-nano', temperature: 0.7 } },
  while: { name: 'While繰り返し', icon: '🔄', color: 'bg-gradient-to-br from-purple-400 to-purple-600', borderColor: 'border-purple-300', textColor: 'text-white', inputs: ['input', 'loop'], outputs: ['output', 'loop'], defaultData: { conditionType: 'variable', condition: '', variable: 'counter', operator: '<', value: '10', maxIterations: 100 } },
  variable_set: { name: '変数設定', icon: '📝', color: 'bg-gradient-to-br from-amber-400 to-amber-600', borderColor: 'border-amber-300', textColor: 'text-white', inputs: ['input'], outputs: ['output'], defaultData: { variableName: '', value: '', useInput: false } },
  variable_get: { name: '変数取得', icon: '📋', color: 'bg-gradient-to-br from-cyan-400 to-cyan-600', borderColor: 'border-cyan-300', textColor: 'text-white', inputs: [], outputs: ['output'], defaultData: { variableName: '' } },
  output: { name: '出力', icon: '📤', color: 'bg-gradient-to-br from-green-400 to-green-600', borderColor: 'border-green-300', textColor: 'text-white', inputs: ['input'], outputs: [], defaultData: { format: 'text', title: '結果', result: '' } }
}

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
  }, 300), []); // 300msに短縮してレスポンス向上

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

  // editingNodeの変更をnodesに反映
  useEffect(() => {
    if (editingNode && selectedNode && editingNode.id === selectedNode.id) {
      setNodes(prev => prev.map(node => 
        node.id === editingNode.id ? editingNode : node
      ));
    }
  }, [editingNode, selectedNode?.id]);

  const connectionPathsCalculation = useCallback(() => {
    return connections.map((conn) => {
      const fromNode = nodes.find(n => n.id === conn.from.nodeId)
      const toNode = nodes.find(n => n.id === conn.to.nodeId)
      if (!fromNode || !toNode) return null

      const fromPortEl = portRefs.current.get(`${conn.from.nodeId}-output-${conn.from.portIndex}`)
      const toPortEl = portRefs.current.get(`${conn.to.nodeId}-input-${conn.to.portIndex}`)
      const canvasEl = canvasRef.current

      if (!fromPortEl || !toPortEl || !canvasEl) {
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

  const updateNodePosition = (nodeId, position) => {
    setNodes(prev => prev.map(node => node.id === nodeId ? { ...node, position } : node));
  };

  const updateNodeSize = (nodeId, size) => {
    setNodes(prev => prev.map(node => node.id === nodeId ? { ...node, size } : node));
  };

  const handleNodeMouseDown = (e, node) => {
    if (e.target.classList.contains('port')) return;
    if (e.target.classList.contains('resize-handle')) return;
    e.preventDefault(); // ドラッグ開始時のテキスト選択を防ぐ
    setDraggedNode(node);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({ x: e.clientX - rect.left - node.position.x, y: e.clientY - rect.top - node.position.y });
    }
  };

  const handleResizeMouseDown = (e, node) => {
    e.stopPropagation();
    e.preventDefault();
    setNodeResizing({
      nodeId: node.id,
      startSize: node.size || { width: 160, height: 120 },
      startMouse: { x: e.clientX, y: e.clientY }
    });
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
    // ドラッグ中のテキスト選択を防ぐ
    if (draggedNode || isConnecting || nodeResizing) {
      e.preventDefault();
      e.stopPropagation();
      document.getSelection()?.removeAllRanges(); // テキスト選択をクリア
    }

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
    
    if (nodeResizing) {
      const deltaX = e.clientX - nodeResizing.startMouse.x;
      const deltaY = e.clientY - nodeResizing.startMouse.y;
      const newSize = {
        width: Math.max(160, nodeResizing.startSize.width + deltaX),
        height: Math.max(120, nodeResizing.startSize.height + deltaY)
      };
      updateNodeSize(nodeResizing.nodeId, newSize);
    }
  }, [draggedNode, dragOffset, isConnecting, draggingLine, nodeResizing]);

  const handleMouseUp = () => {
    if (draggedNode) {
      setDraggedNode(null);
      // ドラッグ終了時にテキスト選択をクリア
      document.getSelection()?.removeAllRanges();
    }
    if (isConnecting) {
      setIsConnecting(false);
      setConnectionStart(null);
      setDraggingLine(null);
      // 接続終了時にもテキスト選択をクリア
      document.getSelection()?.removeAllRanges();
    }
    if (nodeResizing) {
      setNodeResizing(null);
      // リサイズ終了時にもテキスト選択をクリア
      document.getSelection()?.removeAllRanges();
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

  const preprocessNodesForExecution = () => {
    return nodes.map(node => {
      if (node.type === 'output' && node.data.result) {
        return { ...node, data: { ...node.data, result: '' } };
      }
      if (node.type === 'llm' && node.data.currentPrompt) {
        return { ...node, data: { ...node.data, currentPrompt: '' } };
      }
      return node;
    });
  };;

  const processExecutionCompletion = () => {
    const finalContext = nodeExecutionService.executionContext;
    const executionLog = nodeExecutionService.getExecutionLog();
    let newSelectedNode = null;

    setNodes(prevNodes => {
      const newNodes = prevNodes.map(node => {
        // Output ノードの結果を更新
        if (node.type === 'output' && finalContext[node.id] !== undefined) {
          const updatedNode = { ...node, data: { ...node.data, result: String(finalContext[node.id]) } };
          if (selectedNode && selectedNode.id === node.id) newSelectedNode = updatedNode;
          return updatedNode;
        }
        
        // LLM ノードのプロンプト情報を更新
        if (node.type === 'llm') {
          // 実行ログからLLMノードのプロンプト情報を取得
          const llmLogEntry = executionLog.find(log => 
            log.nodeId === node.id && 
            log.message.includes('LLMに送信するプロンプト') && 
            log.data && log.data.prompt
          );
          
          if (llmLogEntry) {
            const updatedNode = { 
              ...node, 
              data: { 
                ...node.data, 
                currentPrompt: llmLogEntry.data.prompt 
              } 
            };
            if (selectedNode && selectedNode.id === node.id) newSelectedNode = updatedNode;
            return updatedNode;
          }
        }
        
        return node;
      });
      return newNodes;
    });

    if (newSelectedNode) onSelectedNodeChange(newSelectedNode);
    setDebugLog(executionLog);
  };;

  const handleRunAll = async () => {
    if (nodes.length === 0) return alert('実行するノードがありません');

    const preprocessedNodes = preprocessNodesForExecution();
    // It's important to use the returned `preprocessedNodes` for execution,
    // but only update the state with the cleared output nodes for UI rendering,
    // without showing the user the manipulated prompt.
    setNodes(preprocessedNodes.map(n => ({...n})));

    const inputNodes = preprocessedNodes.filter(n => n.type === 'input');
    const inputData = Object.fromEntries(inputNodes.map(n => [n.id, n.data.value || '']));
    const exec = await nodeExecutionService.startExecution(preprocessedNodes, connections, inputData, nodeTypes);

    setExecutor(exec);
    setExecutionState({ running: true, currentNodeId: null, executedNodeIds: new Set() });
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
        const outputResults = {};
        const outputNodes = preprocessedNodes.filter(n => n.type === 'output');
        outputNodes.forEach(node => {
          if (nodeExecutionService.executionContext[node.id] !== undefined) {
            outputResults[node.data.label || `出力${node.id}`] = nodeExecutionService.executionContext[node.id];
          }
        });
        
        setExecutionResult({ 
          success: true, 
          variables: finalState.variables,
          outputs: outputResults
        });
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
        const preprocessedNodes = preprocessNodesForExecution();
        setNodes(preprocessedNodes.map(n => ({...n})));

        const inputNodes = preprocessedNodes.filter(n => n.type === 'input');
        const inputData = Object.fromEntries(inputNodes.map(n => [n.id, n.data.value || '']));
        currentExecutor = await nodeExecutionService.startExecution(preprocessedNodes, connections, inputData);
        setExecutor(currentExecutor);
        setExecutionState({ running: true, currentNodeId: null, executedNodeIds: new Set() });
        alert("ステップ実行を開始します。もう一度「ステップ」を押して最初のノードを実行してください。");
        return;
      }
      const result = await currentExecutor.next();
      if (result.done) {
        if (result.value.status === 'completed') {
          alert('ワークフローの実行が完了しました。');
          const outputResults = {};
          const outputNodes = nodes.filter(n => n.type === 'output');
          outputNodes.forEach(node => {
            if (nodeExecutionService.executionContext[node.id] !== undefined) {
              outputResults[node.data.label || `出力${node.id}`] = nodeExecutionService.executionContext[node.id];
            }
          });
          setExecutionResult({
            success: true,
            variables: result.value.variables,
            outputs: outputResults
          });
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
    
    // 出力ノードの結果もクリア
    setNodes(prev => prev.map(node => 
      node.type === 'output' 
        ? { ...node, data: { ...node.data, result: '' } }
        : node
    ));
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

  const renderNode = useCallback((node) => {
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
        className={`absolute bg-white border-2 rounded-lg shadow-lg cursor-move min-w-40 transition-all duration-200 hover:shadow-xl select-none ${borderClass}`}
        style={{ 
          left: node.position.x, 
          top: node.position.y, 
          width: node.size?.width || 160, 
          height: node.size?.height || 120,
          zIndex: isSelected ? 10 : 1, 
          transform: isSelected ? 'scale(1.02)' : 'scale(1)', 
          userSelect: 'none' 
        }}
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
            {node.type === 'input' && node.data.inputType !== 'text' && <div className="truncate">{node.data.value || '入力値を設定...'}</div>}
            {node.type === 'llm' && <textarea className="w-full text-xs bg-transparent border-none focus:ring-0 resize-none" readOnly value={node.data.systemPrompt || 'システムプロンプトを設定...'} placeholder="システムプロンプト..." style={{ height: `${Math.max(60, (node.size?.height || 240) - 140)}px` }} />}
            {node.type === 'if' && <div className="truncate">条件: {node.data.condition?.substring(0, 30)}...</div>}
            {node.type === 'while' && <div className="truncate">繰り返し: {node.data.variable} {node.data.operator} {node.data.value}</div>}
            {node.type === 'variable_set' && <div className="truncate">変数設定: {node.data.variableName} = {node.data.useInput ? '入力値' : node.data.value?.substring(0, 20) + '...'}</div>}
            {node.type === 'variable_get' && <div className="truncate">変数取得: {node.data.variableName}</div>}
            {node.type === 'input' && node.data.inputType === 'text' && <textarea className="w-full text-xs bg-transparent border-none focus:ring-0 resize-none" value={String(node.data.value || '')} onChange={(e) => handleNodeValueChange(node.id, e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} placeholder="入力値..." style={{ height: `${Math.max(10, (node.size?.height || 168) - 110)}px` }} />}
            {node.type === 'output' && <textarea className="w-full text-xs bg-transparent border-none focus:ring-0 resize-none" readOnly value={String(node.data.result || '')} placeholder="実行結果..." style={{ height: `${Math.max(10, (node.size?.height || 168) - 110)}px` }} />}
          </div>
          {nodeType.outputs.map((outputName, index) => (
            <div key={`output-${index}`} className="flex items-center justify-end">
              <span className="text-xs text-gray-600 font-medium mr-2">{outputName}</span>
              <div ref={el => { const key = `${node.id}-output-${index}`; if (el) portRefs.current.set(key, el); else portRefs.current.delete(key); }}
                className={`port w-4 h-4 rounded-full cursor-pointer transition-all duration-200 ${isConnecting && connectionStart?.nodeId === node.id && connectionStart?.portIndex === index ? 'bg-blue-600 ring-2 ring-blue-400' : 'bg-gray-400 hover:bg-blue-500'}`} onMouseDown={(e) => handlePortMouseDown(e, node.id, index, true)} title={`出力: ${outputName}`} />
            </div>
          ))}
        </div>
        {/* リサイズハンドル（入力・出力ノードのみ） */}
        {(node.type === 'input' || node.type === 'output') && (
          <div 
            className="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-gray-400 hover:bg-gray-600 transition-colors"
            style={{ 
              clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
              borderRadius: '0 0 6px 0'
            }}
            onMouseDown={(e) => handleResizeMouseDown(e, node)}
            title="ドラッグでサイズ変更"
          />
        )}
      </div>
    )
  }, [selectedNode, executionState, isConnecting, connectionStart, handleNodeMouseDown, handleNodeClick, deleteNode, handlePortMouseUp, handlePortMouseDown, handleNodeValueChange]); // nodeTypesは外部定数のため依存配列から除外

  const renderConnections = useCallback(() => {
    return connectionPaths.map((path, index) => {
      const { id, pathData, strokeColor, fromPortName, fromX, fromY } = path;
      const isSelected = selectedConnection === id;
      
      // 接続線が処理中かどうかを判定
      const connection = connections.find(conn => conn.id === id);
      const isProcessing = connection && 
        executionState.running && 
        (executionState.currentNodeId === connection.to.nodeId ||  // 現在のノードへの入力
         executionState.executedNodeIds.has(connection.from.nodeId)); // 実行済みノードからの出力
      
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
            {!isSelected && isProcessing && (<circle r="4" fill={strokeColor} className="opacity-80"><animateMotion dur="2s" repeatCount="indefinite" path={pathData} /></circle>)}
          </g>
          {fromPortName !== 'output' && (<text x={fromX + 5} y={fromY - 8} className="text-xs font-medium fill-gray-600" textAnchor="start" style={{ pointerEvents: 'none' }}>{fromPortName}</text>)}
        </svg>
      )
    })
  }, [connectionPaths, selectedConnection, setSelectedConnection, connections, executionState]);

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
          <Button onClick={handleResetExecution} disabled={!executionState.running && !executionResult && debugLog.length === 0} size="sm" variant="destructive" className="gap-1.5"><RotateCcw className="h-4 w-4" />リセット</Button>
          
          <div className="w-px h-6 bg-gray-200 mx-2" />
          
          <Button onClick={() => setShowHistoryView(!showHistoryView)} size="sm" variant={showHistoryView ? "default" : "outline"} className="gap-1.5"><History className="h-4 w-4" />実行履歴</Button>
        </div>
        <div ref={canvasRef} className="w-full h-full relative cursor-crosshair select-none" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onContextMenu={handleCanvasRightClick} onClick={() => { closeContextMenu(); onSelectedNodeChange(null); setSelectedConnection(null) }} style={{ backgroundImage: 'radial-gradient(circle, #ccc 1px, transparent 1px)', backgroundSize: '20px 20px', userSelect: draggedNode || isConnecting ? 'none' : 'auto' }}>
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
