import React, { useState, useRef, useCallback } from 'react'
import { Plus, Play, Save, Download, Upload, Trash2, Square, FileUp, StepForward, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Progress } from '@/components/ui/progress.jsx'
import nodeExecutionService from '../services/nodeExecutionService.js'

const NodeEditor = () => {
  const [nodes, setNodes] = useState([])
  const [connections, setConnections] = useState([])
  const [selectedNode, setSelectedNode] = useState(null)
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
  const [executionState, setExecutionState] = useState({
    running: false,
    currentNodeId: null,
    executedNodeIds: new Set(),
  })
  const canvasRef = useRef(null)

  // 接続を削除するキーボードイベント
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

  // ノードタイプの定義
  const nodeTypes = {
    input: { name: '入力', icon: '📥', color: 'bg-gradient-to-br from-orange-400 to-orange-600', borderColor: 'border-orange-300', textColor: 'text-white', inputs: [], outputs: ['output'], defaultData: { value: '', placeholder: '入力値を設定してください' } },
    llm: { name: 'LLM生成', icon: '🤖', color: 'bg-gradient-to-br from-blue-400 to-blue-600', borderColor: 'border-blue-300', textColor: 'text-white', inputs: ['input'], outputs: ['output'], defaultData: { prompt: 'あなたは優秀なアシスタントです。以下の入力に対して適切に回答してください。\n\n入力: {{input}}', temperature: 0.7, model: 'default' } },
    if: { name: 'If条件分岐', icon: '🔀', color: 'bg-gradient-to-br from-pink-400 to-pink-600', borderColor: 'border-pink-300', textColor: 'text-white', inputs: ['input'], outputs: ['true', 'false'], defaultData: { conditionType: 'llm', condition: '入力が肯定的な内容かどうか判断してください', variable: '', operator: '==', value: '' } },
    while: { name: 'While繰り返し', icon: '🔄', color: 'bg-gradient-to-br from-purple-400 to-purple-600', borderColor: 'border-purple-300', textColor: 'text-white', inputs: ['input', 'loop'], outputs: ['output', 'loop'], defaultData: { conditionType: 'variable', condition: '', variable: 'counter', operator: '<', value: '10', maxIterations: 100 } },
    output: { name: '出力', icon: '📤', color: 'bg-gradient-to-br from-green-400 to-green-600', borderColor: 'border-green-300', textColor: 'text-white', inputs: ['input'], outputs: [], defaultData: { format: 'text', title: '結果' } }
  }

  const handleCanvasRightClick = (e) => { e.preventDefault(); const rect = canvasRef.current.getBoundingClientRect(); setContextMenu({ x: e.clientX, y: e.clientY, canvasX: e.clientX - rect.left, canvasY: e.clientY - rect.top }) }
  const closeContextMenu = () => setContextMenu(null)
  const addNodeFromContext = (nodeType) => { if (contextMenu) { addNode(nodeType, contextMenu.canvasX, contextMenu.canvasY); closeContextMenu() } }
  const addNode = (type, x = null, y = null) => { const nodeType = nodeTypes[type]; if (!nodeType) return; const newNode = { id: `${type}_${Date.now()}`, type, position: { x: x !== null ? x : 100 + Math.random() * 200, y: y !== null ? y : 100 + Math.random() * 200 }, data: { label: nodeType.name, ...nodeType.defaultData } }; setNodes(prev => [...prev, newNode]) }
  const updateNodePosition = (nodeId, position) => setNodes(prev => prev.map(node => node.id === nodeId ? { ...node, position } : node))
  const updateNodeData = (nodeId, data) => {
    let newSelectedNode = null;
    setNodes(prev => {
      const newNodes = prev.map(node => {
        if (node.id === nodeId) {
          const updatedNode = { ...node, data: { ...node.data, ...data } };
          if (selectedNode && selectedNode.id === nodeId) {
            newSelectedNode = updatedNode;
          }
          return updatedNode;
        }
        return node;
      });
      return newNodes;
    });

    if (newSelectedNode) {
      setSelectedNode(newSelectedNode);
    }
  }
  const handleNodeMouseDown = (e, node) => {
    if (e.target.classList.contains('port')) return;
    setDraggedNode(node);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left - node.position.x,
        y: e.clientY - rect.top - node.position.y
      });
    }
  };

  const handleNodeClick = (e, node) => {
    e.stopPropagation();
    setSelectedNode(node);
    setSelectedConnection(null);
  }
  const handlePortMouseDown = (e, nodeId, portIndex, isOutput) => { e.stopPropagation(); if (!isOutput) return; const fromNode = nodes.find(n => n.id === nodeId); if (!fromNode) return; const rect = e.target.getBoundingClientRect(); const canvasRect = canvasRef.current.getBoundingClientRect(); const startX = rect.left + rect.width / 2 - canvasRect.left; const startY = rect.top + rect.height / 2 - canvasRect.top; setIsConnecting(true); setConnectionStart({ nodeId, portIndex }); setDraggingLine({ startX, startY, endX: startX, endY: startY }) }
  const handleMouseMove = useCallback((e) => { const canvasRect = canvasRef.current.getBoundingClientRect(); const mouseX = e.clientX - canvasRect.left; const mouseY = e.clientY - canvasRect.top; if (draggedNode) { const newPosition = { x: mouseX - dragOffset.x, y: mouseY - dragOffset.y }; updateNodePosition(draggedNode.id, newPosition) } if (isConnecting && draggingLine) { setDraggingLine(prev => ({ ...prev, endX: mouseX, endY: mouseY })) } }, [draggedNode, dragOffset, isConnecting, draggingLine])
  const handleMouseUp = () => { if (draggedNode) { setDraggedNode(null) } if (isConnecting) { setIsConnecting(false); setConnectionStart(null); setDraggingLine(null) } }
  const handlePortMouseUp = (e, nodeId, portIndex, isOutput) => { if (isOutput || !isConnecting || !connectionStart) return; if (connectionStart.nodeId === nodeId) return; if (connections.some(conn => conn.to.nodeId === nodeId && conn.to.portIndex === portIndex)) { console.log("Input port is already connected."); return } const newConnection = { id: `conn_${Date.now()}`, from: connectionStart, to: { nodeId, portIndex } }; setConnections(prev => [...prev, newConnection]); setIsConnecting(false); setConnectionStart(null); setDraggingLine(null) }

  const handleRunAll = async () => {
    if (nodes.length === 0) return alert('実行するノードがありません');
    
    const inputNodes = nodes.filter(n => n.type === 'input');
    const inputData = Object.fromEntries(inputNodes.map(n => [n.id, n.data.value || '']));

    const exec = nodeExecutionService.startExecution(nodes, connections, inputData);
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

      // Handle final state
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
      setExecutionState({ running: false, currentNodeId: null, executedNodeIds: new Set() });
      setExecutor(null);
      setDebugLog(nodeExecutionService.getExecutionLog());
    }
  };

  const handleStepForward = async () => {
    let currentExecutor = executor;

    try {
      if (!currentExecutor) {
        const inputNodes = nodes.filter(node => node.type === 'input');
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
        handleResetExecution();
      } else {
        setExecutionState(prev => ({ ...prev, currentNodeId: result.value.currentNodeId, executedNodeIds: new Set(prev.executedNodeIds).add(result.value.currentNodeId) }));
      }
    } catch (error) {
      console.error("Step forward failed:", error);
      setExecutionResult({ success: false, error: error.message });
      handleResetExecution();
    } finally {
      setDebugLog(nodeExecutionService.getExecutionLog());
    }
  };

  const handleResetExecution = () => {
    if (executor) executor.stop();
    setExecutor(null);
    setExecutionState({ running: false, currentNodeId: null, executedNodeIds: new Set() });
    setExecutionResult(null);
    setDebugLog([]);
  };

  const saveWorkflow = () => { const workflow = { nodes, connections }; localStorage.setItem('llm-agent-workflow', JSON.stringify(workflow)); alert('ワークフローを保存しました') }
  const exportWorkflow = () => { const workflow = { nodes, connections }; const dataStr = JSON.stringify(workflow, null, 2); const dataBlob = new Blob([dataStr], { type: 'application/json' }); const url = URL.createObjectURL(dataBlob); const link = document.createElement('a'); link.href = url; link.download = `workflow_${new Date().toISOString().split('T')[0]}.json`; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url) }
  const importWorkflow = () => { const input = document.createElement('input'); input.type = 'file'; input.accept = '.json'; input.onchange = e => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = e => { try { const wf = JSON.parse(e.target.result); if (wf.nodes && wf.connections) { setNodes(wf.nodes); setConnections(wf.connections); setSelectedNode(null); alert('ワークフローをインポートしました') } else { alert('無効なワークフローファイルです') } } catch (err) { alert('ファイルの読み込みに失敗しました') } }; reader.readAsText(file) }; input.click() }
  const loadWorkflow = () => { try { const saved = localStorage.getItem('llm-agent-workflow'); if (saved) { const wf = JSON.parse(saved); if (wf.nodes && wf.connections) { setNodes(wf.nodes); setConnections(wf.connections); setSelectedNode(null); alert('保存されたワークフローを読み込みました') } } else { alert('保存されたワークフローがありません') } } catch (err) { alert('ワークフローの読み込みに失敗しました') } }
  const deleteNode = (nodeId) => { setNodes(prev => prev.filter(node => node.id !== nodeId)); setConnections(prev => prev.filter(conn => conn.from.nodeId !== nodeId && conn.to.nodeId !== nodeId)); if (selectedNode?.id === nodeId) setSelectedNode(null) }

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
      <div key={node.id} className={`absolute bg-white border-2 rounded-lg shadow-lg cursor-move min-w-40 transition-all duration-200 hover:shadow-xl ${borderClass}`} style={{ left: node.position.x, top: node.position.y, zIndex: isSelected ? 10 : 1, transform: isSelected ? 'scale(1.02)' : 'scale(1)' }} onMouseDown={(e) => handleNodeMouseDown(e, node)} onClick={(e) => handleNodeClick(e, node)}>
        <div className={`${nodeType.color} ${nodeType.textColor} px-3 py-2 rounded-t-md flex items-center justify-between`}>
          <div className="flex items-center space-x-2"><span className="text-lg">{nodeType.icon}</span><span className="text-sm font-medium truncate max-w-24">{node.data.label}</span></div>
          <button onClick={(e) => { e.stopPropagation(); deleteNode(node.id) }} className="text-white hover:text-red-200 ml-2 opacity-70 hover:opacity-100 transition-opacity"><Trash2 className="h-3 w-3" /></button>
        </div>
        <div className="p-3 space-y-2">
          {nodeType.inputs.map((inputName, index) => (
            <div key={`input-${index}`} className="flex items-center">
              <div className={`port w-4 h-4 rounded-full cursor-pointer transition-all duration-200 mr-2 ${isConnecting ? 'bg-green-400 hover:bg-green-500 shadow-lg' : 'bg-gray-400 hover:bg-gray-600'}`} onMouseUp={(e) => handlePortMouseUp(e, node.id, index, false)} title={`入力: ${inputName}`} />
              <span className="text-xs text-gray-600 font-medium">{inputName}</span>
            </div>
          ))}
          <div className="text-xs text-gray-700 bg-gray-50 p-2 rounded border">
            {node.type === 'input' && <div className="truncate">{node.data.value || node.data.placeholder}</div>}
            {node.type === 'llm' && <div className="truncate">プロンプト: {node.data.prompt?.substring(0, 30)}...</div>}
            {node.type === 'if' && <div className="truncate">条件: {node.data.condition?.substring(0, 30)}...</div>}
            {node.type === 'while' && <div className="truncate">繰り返し: {node.data.variable} {node.data.operator} {node.data.value}</div>}
            {node.type === 'output' && <div className="truncate">形式: {node.data.format}</div>}
          </div>
          {nodeType.outputs.map((outputName, index) => (
            <div key={`output-${index}`} className="flex items-center justify-end">
              <span className="text-xs text-gray-600 font-medium mr-2">{outputName}</span>
              <div className={`port w-4 h-4 rounded-full cursor-pointer transition-all duration-200 ${isConnecting && connectionStart?.nodeId === node.id && connectionStart?.portIndex === index ? 'bg-blue-600 ring-2 ring-blue-400' : 'bg-gray-400 hover:bg-blue-500'}`} onMouseDown={(e) => handlePortMouseDown(e, node.id, index, true)} title={`出力: ${outputName}`} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderConnections = () => {
    return connections.map((conn, index) => {
      const fromNode = nodes.find(n => n.id === conn.from.nodeId);
      const toNode = nodes.find(n => n.id === conn.to.nodeId);
      if (!fromNode || !toNode) return null;

      const nodeWidth = 160;
      const fromX = fromNode.position.x + nodeWidth;
      const fromNodeType = nodeTypes[fromNode.type];

      const headerHeight = 40;
      const portSlotHeight = 24;
      const previewHeight = 28;
      const bodyPadding = 12;
      const margin = 8;

      const inputsHeight = fromNodeType.inputs.length * portSlotHeight;
      const fromYOffset = headerHeight + bodyPadding + inputsHeight + margin + previewHeight + margin;

      const fromY = fromNode.position.y + fromYOffset + (conn.from.portIndex * portSlotHeight);

      const toX = toNode.position.x;
      const toY = toNode.position.y + headerHeight + bodyPadding + (conn.to.portIndex * portSlotHeight);

      const isLoop = fromNode.id === toNode.id;
      const pathData = isLoop ? `M ${fromX} ${fromY} C ${fromX + 60} ${fromY - 60}, ${toX - 60} ${toY - 60}, ${toX} ${toY}` : `M ${fromX} ${fromY} C ${fromX + Math.abs(toX - fromX) * 0.4} ${fromY}, ${toX - Math.abs(toX - fromX) * 0.4} ${toY}, ${toX} ${toY}`;
      
      const fromPortName = nodeTypes[fromNode.type].outputs[conn.from.portIndex];
      let strokeColor = '#3b82f6';
      if (fromPortName === 'true') strokeColor = '#10b981';
      else if (fromPortName === 'false') strokeColor = '#ef4444';
      else if (fromPortName === 'loop') strokeColor = '#8b5cf6';

      const isSelected = selectedConnection === conn.id;

      return (
        <svg key={conn.id || index} className="absolute z-10" style={{ left: 0, top: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
          <defs>
            <linearGradient id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor={strokeColor} stopOpacity={0.8} /><stop offset="100%" stopColor={strokeColor} stopOpacity={0.48} /></linearGradient>
            <filter id={`glow-${index}`}><feGaussianBlur stdDeviation="3.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <marker id={`arrowhead-${index}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill={strokeColor} /></marker>
            <marker id="arrowhead-selected" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#e11d48" /></marker>
          </defs>
          <g className="cursor-pointer" onClick={(e) => { e.stopPropagation(); setSelectedConnection(conn.id); }} style={{ pointerEvents: 'all' }}>
            <path d={pathData} stroke="transparent" strokeWidth="20" fill="none" />
            <path d={pathData} stroke={isSelected ? '#e11d48' : `url(#gradient-${index})`} strokeWidth={isSelected ? 4 : 3} fill="none" filter={isSelected ? 'url(#glow-selected)' : `url(#glow-${index})`} markerEnd={isSelected ? 'url(#arrowhead-selected)' : `url(#arrowhead-${index})`} className="transition-all duration-200" />
            {!isSelected && (<circle r="4" fill={strokeColor} className="opacity-80"><animateMotion dur="2s" repeatCount="indefinite" path={pathData} /></circle>)}
          </g>
          {fromPortName !== 'output' && (<text x={fromX - 5} y={fromY - 8} className="text-xs font-medium fill-gray-600" textAnchor="end" style={{ pointerEvents: 'none' }}>{fromPortName}</text>)}
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
          <Button onClick={handleRunAll} disabled={executionState.running} size="sm" className="gap-1.5 bg-green-500 hover:bg-green-600 text-white"><Play className="h-4 w-4" />すべて実行</Button>
          <Button onClick={handleStepForward} disabled={executionState.running && executor} size="sm" variant="outline" className="gap-1.5"><StepForward className="h-4 w-4" />ステップ</Button>
          <Button onClick={handleResetExecution} disabled={!executionState.running} size="sm" variant="destructive" className="gap-1.5"><RotateCcw className="h-4 w-4" />リセット</Button>
          <div className="w-px h-6 bg-gray-200" />
          <Button onClick={saveWorkflow} size="sm" variant="outline" className="gap-1.5"><Save className="h-4 w-4" />保存</Button>
          <Button onClick={loadWorkflow} size="sm" variant="outline" className="gap-1.5"><Upload className="h-4 w-4" />読込</Button>
          <Button onClick={exportWorkflow} size="sm" variant="outline" className="gap-1.5"><Download className="h-4 w-4" />エクスポート</Button>
          <Button onClick={importWorkflow} size="sm" variant="outline" className="gap-1.5"><FileUp className="h-4 w-4" />インポート</Button>
        </div>
        <div ref={canvasRef} className="w-full h-full relative cursor-crosshair" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onContextMenu={handleCanvasRightClick} onClick={(e) => { closeContextMenu(); setSelectedNode(null); setSelectedConnection(null) }} style={{ backgroundImage: 'radial-gradient(circle, #ccc 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
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
        {selectedNode ? (
          <div className="p-4">
            <h3 className="font-semibold mb-4 text-sm">ノードプロパティ</h3>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">ノード名</label><input type="text" value={selectedNode.data.label} onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })} className="w-full px-3 py-2 border rounded-md" /></div>
              {selectedNode.type === 'input' && ( <><div><label className="block text-sm font-medium mb-1">入力値</label><textarea value={selectedNode.data.value || ''} onChange={(e) => updateNodeData(selectedNode.id, { value: e.target.value })} className="w-full px-3 py-2 border rounded-md" rows={3} placeholder="実行時の入力値を設定します" /></div></> )}
              {selectedNode.type === 'llm' && ( <><div><label className="block text-sm font-medium mb-1">プロンプト</label><textarea value={selectedNode.data.prompt || ''} onChange={(e) => updateNodeData(selectedNode.id, { prompt: e.target.value })} className="w-full px-3 py-2 border rounded-md" rows={5} placeholder="プロンプトを入力してください" /></div><div><label className="block text-sm font-medium mb-1">Temperature</label><input type="number" value={selectedNode.data.temperature || 0.7} onChange={(e) => updateNodeData(selectedNode.id, { temperature: parseFloat(e.target.value) })} className="w-full px-3 py-2 border rounded-md" min="0" max="2" step="0.1" /></div></> )}
              {selectedNode.type === 'if' && ( <><div><label className="block text-sm font-medium mb-1">条件タイプ</label><select value={selectedNode.data.conditionType || 'llm'} onChange={(e) => updateNodeData(selectedNode.id, { conditionType: e.target.value })} className="w-full px-3 py-2 border rounded-md"><option value="llm">LLM判断</option><option value="variable">変数比較</option></select></div>{selectedNode.data.conditionType === 'llm' ? (<div><label className="block text-sm font-medium mb-1">判断条件</label><textarea value={selectedNode.data.condition || ''} onChange={(e) => updateNodeData(selectedNode.id, { condition: e.target.value })} className="w-full px-3 py-2 border rounded-md" rows={3} placeholder="LLMに判断させる条件を入力" /></div>) : (<><div><label className="block text-sm font-medium mb-1">変数名</label><input type="text" value={selectedNode.data.variable || ''} onChange={(e) => updateNodeData(selectedNode.id, { variable: e.target.value })} className="w-full px-3 py-2 border rounded-md" placeholder="比較する変数名" /></div><div><label className="block text-sm font-medium mb-1">演算子</label><select value={selectedNode.data.operator || '=='} onChange={(e) => updateNodeData(selectedNode.id, { operator: e.target.value })} className="w-full px-3 py-2 border rounded-md"><option value="==">==(等しい)</option><option value="!=">!=(等しくない)</option><option value="<">&lt;(より小さい)</option><option value="<=">&lt;=(以下)</option><option value=">">&gt;(より大きい)</option><option value=">=">&gt;=(以上)</option></select></div><div><label className="block text-sm font-medium mb-1">比較値</label><input type="text" value={selectedNode.data.value || ''} onChange={(e) => updateNodeData(selectedNode.id, { value: e.target.value })} className="w-full px-3 py-2 border rounded-md" placeholder="比較する値" /></div></>)}</> )}
              {selectedNode.type === 'while' && ( <><div><label className="block text-sm font-medium mb-1">条件タイプ</label><select value={selectedNode.data.conditionType || 'variable'} onChange={(e) => updateNodeData(selectedNode.id, { conditionType: e.target.value })} className="w-full px-3 py-2 border rounded-md"><option value="variable">変数比較</option><option value="llm">LLM判断</option></select></div>{selectedNode.data.conditionType === 'variable' ? (<><div><label className="block text-sm font-medium mb-1">変数名</label><input type="text" value={selectedNode.data.variable || ''} onChange={(e) => updateNodeData(selectedNode.id, { variable: e.target.value })} className="w-full px-3 py-2 border rounded-md" placeholder="比較する変数名" /></div><div><label className="block text-sm font-medium mb-1">演算子</label><select value={selectedNode.data.operator || '<'} onChange={(e) => updateNodeData(selectedNode.id, { operator: e.target.value })} className="w-full px-3 py-2 border rounded-md"><option value="==">==(等しい)</option><option value="!=">!=(等しくない)</option><option value="<">&lt;(より小さい)</option><option value="<=">&lt;=(以下)</option><option value=">">&gt;(より大きい)</option><option value=">=">&gt;=(以上)</option></select></div><div><label className="block text-sm font-medium mb-1">比較値</label><input type="text" value={selectedNode.data.value || ''} onChange={(e) => updateNodeData(selectedNode.id, { value: e.target.value })} className="w-full px-3 py-2 border rounded-md" placeholder="比較する値" /></div></>) : (<div><label className="block text-sm font-medium mb-1">継続条件</label><textarea value={selectedNode.data.condition || ''} onChange={(e) => updateNodeData(selectedNode.id, { condition: e.target.value })} className="w-full px-3 py-2 border rounded-md" rows={3} placeholder="繰り返しを継続する条件を入力" /></div>)}<div><label className="block text-sm font-medium mb-1">最大繰り返し回数</label><input type="number" value={selectedNode.data.maxIterations || 100} onChange={(e) => updateNodeData(selectedNode.id, { maxIterations: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-md" min="1" max="1000" /></div></> )}
              {selectedNode.type === 'output' && ( <div><label className="block text-sm font-medium mb-1">出力形式</label><select value={selectedNode.data.format || 'text'} onChange={(e) => updateNodeData(selectedNode.id, { format: e.target.value })} className="w-full px-3 py-2 border rounded-md"><option value="text">テキスト</option><option value="json">JSON</option><option value="markdown">Markdown</option></select></div> )}
            </div>
          </div>
        ) : (
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

export default NodeEditor
