import React, { useState, useRef, useCallback } from 'react'
import { Plus, Play, Save, Download, Upload, Trash2, Square } from 'lucide-react'
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
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionProgress, setExecutionProgress] = useState(null)
  const [executionResult, setExecutionResult] = useState(null)
  const [showDebugLog, setShowDebugLog] = useState(false)
  const [debugLog, setDebugLog] = useState([])
  const [contextMenu, setContextMenu] = useState(null)
  const canvasRef = useRef(null)

  // ノードタイプの定義
  const nodeTypes = {
    input: {
      name: '入力',
      icon: '📥',
      color: 'bg-gradient-to-br from-orange-400 to-orange-600',
      borderColor: 'border-orange-300',
      textColor: 'text-white',
      inputs: [],
      outputs: ['output'],
      defaultData: { value: '', placeholder: '入力値を設定してください' }
    },
    llm: {
      name: 'LLM生成',
      icon: '🤖',
      color: 'bg-gradient-to-br from-blue-400 to-blue-600',
      borderColor: 'border-blue-300',
      textColor: 'text-white',
      inputs: ['input'],
      outputs: ['output'],
      defaultData: { 
        prompt: 'あなたは優秀なアシスタントです。以下の入力に対して適切に回答してください。\n\n入力: {{input}}', 
        temperature: 0.7,
        model: 'default'
      }
    },
    if: {
      name: 'If条件分岐',
      icon: '🔀',
      color: 'bg-gradient-to-br from-pink-400 to-pink-600',
      borderColor: 'border-pink-300',
      textColor: 'text-white',
      inputs: ['input'],
      outputs: ['true', 'false'],  // 2つの出力ポート
      defaultData: { 
        conditionType: 'llm', 
        condition: '入力が肯定的な内容かどうか判断してください', 
        variable: '', 
        operator: '==', 
        value: ''
      }
    },
    while: {
      name: 'While繰り返し',
      icon: '🔄',
      color: 'bg-gradient-to-br from-purple-400 to-purple-600',
      borderColor: 'border-purple-300',
      textColor: 'text-white',
      inputs: ['input', 'loop'],  // 通常入力とループバック入力
      outputs: ['output', 'loop'],  // 通常出力とループバック出力
      defaultData: { 
        conditionType: 'variable', 
        condition: '', 
        variable: 'counter', 
        operator: '<', 
        value: '10', 
        maxIterations: 100 
      }
    },
    output: {
      name: '出力',
      icon: '📤',
      color: 'bg-gradient-to-br from-green-400 to-green-600',
      borderColor: 'border-green-300',
      textColor: 'text-white',
      inputs: ['input'],
      outputs: [],
      defaultData: { format: 'text', title: '結果' }
    }
  }

  // キャンバスの右クリックイベント
  const handleCanvasRightClick = (e) => {
    e.preventDefault()
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      canvasX: x,
      canvasY: y
    })
  }

  // コンテキストメニューを閉じる
  const closeContextMenu = () => {
    setContextMenu(null)
  }

  // コンテキストメニューからノードを追加
  const addNodeFromContext = (nodeType) => {
    if (contextMenu) {
      addNode(nodeType, contextMenu.canvasX, contextMenu.canvasY)
      closeContextMenu()
    }
  }

  // ノードを追加
  const addNode = (type, x = null, y = null) => {
    const nodeType = nodeTypes[type]
    if (!nodeType) return
    
    const newNode = {
      id: `${type}_${Date.now()}`,
      type,
      position: { 
        x: x !== null ? x : 100 + Math.random() * 200, 
        y: y !== null ? y : 100 + Math.random() * 200 
      },
      data: {
        label: nodeType.name,
        ...nodeType.defaultData
      }
    }
    setNodes(prev => [...prev, newNode])
  }

  // ノードの位置を更新
  const updateNodePosition = (nodeId, position) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, position } : node
    ))
  }

  // ノードのデータを更新
  const updateNodeData = (nodeId, data) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
    ))
  }

  // マウスイベントハンドラ
  const handleMouseDown = (e, node) => {
    if (e.target.classList.contains('port')) return
    
    setDraggedNode(node)
    setSelectedNode(node)
    const rect = canvasRef.current?.getBoundingClientRect()
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left - node.position.x,
        y: e.clientY - rect.top - node.position.y
      })
    }
  }

  const handleMouseMove = useCallback((e) => {
    if (draggedNode && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      const newPosition = {
        x: e.clientX - rect.left - dragOffset.x,
        y: e.clientY - rect.top - dragOffset.y
      }
      updateNodePosition(draggedNode.id, newPosition)
    }
  }, [draggedNode, dragOffset])

  const handleMouseUp = () => {
    setDraggedNode(null)
  }

  // ポート接続（useCallbackで安定化）
  const handlePortClick = useCallback((nodeId, portIndex, isOutput) => {
    console.log('ポートクリック:', { nodeId, portIndex, isOutput });
    
    setIsConnecting(prevIsConnecting => {
      setConnectionStart(prevConnectionStart => {
        console.log('現在の状態:', { prevIsConnecting, prevConnectionStart });
        
        if (prevIsConnecting && prevConnectionStart) {
          if (!isOutput && prevConnectionStart.nodeId !== nodeId) {
            // 接続を作成（出力ポートから入力ポートへ）
            const newConnection = {
              id: `conn_${Date.now()}`,
              from: prevConnectionStart,
              to: { nodeId, portIndex }
            }
            console.log('新しい接続を作成:', newConnection);
            
            setConnections(prev => {
              const updated = [...prev, newConnection];
              console.log('接続配列を更新:', updated);
              return updated;
            });
            
            // 接続完了後の状態リセット
            setTimeout(() => {
              setIsConnecting(false);
              setConnectionStart(null);
            }, 0);
            
            return null; // connectionStartをリセット
          } else {
            // 接続をキャンセル（同じノードまたは出力ポート同士）
            console.log('接続をキャンセル');
            setTimeout(() => {
              setIsConnecting(false);
              setConnectionStart(null);
            }, 0);
            return null;
          }
        } else if (isOutput) {
          // 接続を開始（出力ポートから）
          console.log('接続を開始:', { nodeId, portIndex });
          setTimeout(() => {
            setIsConnecting(true);
            setConnectionStart({ nodeId, portIndex });
          }, 0);
          return { nodeId, portIndex };
        } else if (!prevIsConnecting) {
          // 接続中でない場合の入力ポートクリック（何もしない）
          console.log('接続中ではないため、入力ポートクリックは無視');
          return prevConnectionStart;
        }
        
        return prevConnectionStart;
      });
      
      return prevIsConnecting;
    });
  }, [])

  // 接続をキャンセル
  const cancelConnection = () => {
    setIsConnecting(false)
    setConnectionStart(null)
  }

  // ワークフローを実行
  const executeWorkflow = async () => {
    if (nodes.length === 0) {
      alert('実行するノードがありません')
      return
    }

    setIsExecuting(true)
    setExecutionProgress(null)
    setExecutionResult(null)
    setDebugLog([])

    // デバッグモードを有効化
    nodeExecutionService.setDebugMode(true)

    try {
      // 入力ノードからデータを収集
      const inputNodes = nodes.filter(node => node.type === 'input')
      const inputData = {}
      inputNodes.forEach(node => {
        inputData[node.id] = node.data.value || ''
      })

      // ワークフローを実行
      const result = await nodeExecutionService.executeWorkflow(
        nodes,
        connections,
        inputData,
        (progress) => {
          setExecutionProgress(progress)
        }
      )

      setExecutionResult(result)
      setDebugLog(result.executionLog || [])
    } catch (error) {
      console.error('ワークフロー実行エラー:', error)
      const errorResult = {
        success: false,
        error: error.message
      }
      setExecutionResult(errorResult)
      
      // エラー時もログを取得
      const log = nodeExecutionService.getExecutionLog()
      setDebugLog(log)
    } finally {
      setIsExecuting(false)
    }
  }

  // 実行を停止
  const stopExecution = () => {
    nodeExecutionService.stopExecution()
    setIsExecuting(false)
    setExecutionProgress(null)
  }

  // ワークフローを保存
  const saveWorkflow = () => {
    const workflow = {
      nodes,
      connections,
      metadata: {
        name: 'ワークフロー',
        created: new Date().toISOString(),
        version: '1.0'
      }
    }
    
    localStorage.setItem('llm-agent-workflow', JSON.stringify(workflow))
    alert('ワークフローを保存しました')
  }

  // ワークフローをエクスポート
  const exportWorkflow = () => {
    const workflow = {
      nodes,
      connections,
      metadata: {
        name: 'ワークフロー',
        created: new Date().toISOString(),
        version: '1.0'
      }
    }
    
    const dataStr = JSON.stringify(workflow, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `workflow_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // ワークフローをインポート
  const importWorkflow = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (!file) return
      
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const workflow = JSON.parse(e.target.result)
          if (workflow.nodes && workflow.connections) {
            setNodes(workflow.nodes)
            setConnections(workflow.connections)
            setSelectedNode(null)
            alert('ワークフローをインポートしました')
          } else {
            alert('無効なワークフローファイルです')
          }
        } catch (error) {
          alert('ファイルの読み込みに失敗しました')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  // 保存されたワークフローを読み込み
  const loadWorkflow = () => {
    try {
      const saved = localStorage.getItem('llm-agent-workflow')
      if (saved) {
        const workflow = JSON.parse(saved)
        if (workflow.nodes && workflow.connections) {
          setNodes(workflow.nodes)
          setConnections(workflow.connections)
          setSelectedNode(null)
          alert('保存されたワークフローを読み込みました')
        }
      } else {
        alert('保存されたワークフローがありません')
      }
    } catch (error) {
      alert('ワークフローの読み込みに失敗しました')
    }
  }

  // ノードを削除
  const deleteNode = (nodeId) => {
    setNodes(prev => prev.filter(node => node.id !== nodeId))
    setConnections(prev => prev.filter(conn => 
      conn.from.nodeId !== nodeId && conn.to.nodeId !== nodeId
    ))
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null)
    }
  }

  // ノードレンダリング
  const renderNode = (node) => {
    const nodeType = nodeTypes[node.type]
    if (!nodeType) return null
    
    const isSelected = selectedNode?.id === node.id

    return (
      <div
        key={node.id}
        className={`absolute bg-white border-2 rounded-lg shadow-lg cursor-move min-w-40 transition-all duration-200 hover:shadow-xl ${
          isSelected ? `${nodeType.borderColor} border-4 shadow-2xl` : 'border-gray-300'
        }`}
        style={{
          left: node.position.x,
          top: node.position.y,
          zIndex: isSelected ? 10 : 1,
          transform: isSelected ? 'scale(1.02)' : 'scale(1)'
        }}
        onMouseDown={(e) => handleMouseDown(e, node)}
      >
        {/* ヘッダー */}
        <div className={`${nodeType.color} ${nodeType.textColor} px-3 py-2 rounded-t-md flex items-center justify-between`}>
          <div className="flex items-center space-x-2">
            <span className="text-lg">{nodeType.icon}</span>
            <span className="text-sm font-medium truncate max-w-24">{node.data.label}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              deleteNode(node.id)
            }}
            className="text-white hover:text-red-200 ml-2 opacity-70 hover:opacity-100 transition-opacity"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
        
        {/* ボディ */}
        <div className="p-3 space-y-2">
          {/* 入力ポート */}
          {nodeType.inputs.map((inputName, index) => (
            <div key={`input-${index}`} className="flex items-center">
              <div
                className={`port w-4 h-4 rounded-full cursor-pointer transition-all duration-200 mr-2 ${
                  isConnecting && connectionStart?.nodeId !== node.id 
                    ? 'bg-green-400 hover:bg-green-500 shadow-lg' 
                    : 'bg-gray-400 hover:bg-gray-600'
                }`}
                onClick={() => handlePortClick(node.id, index, false)}
                title={`入力: ${inputName}`}
              />
              <span className="text-xs text-gray-600 font-medium">{inputName}</span>
            </div>
          ))}
          
          {/* ノード内容プレビュー */}
          <div className="text-xs text-gray-700 bg-gray-50 p-2 rounded border">
            {node.type === 'input' && (
              <div className="truncate">{node.data.value || node.data.placeholder}</div>
            )}
            {node.type === 'llm' && (
              <div className="truncate">プロンプト: {node.data.prompt?.substring(0, 30)}...</div>
            )}
            {node.type === 'if' && (
              <div className="truncate">条件: {node.data.condition?.substring(0, 30)}...</div>
            )}
            {node.type === 'while' && (
              <div className="truncate">繰り返し: {node.data.variable} {node.data.operator} {node.data.value}</div>
            )}
            {node.type === 'output' && (
              <div className="truncate">形式: {node.data.format}</div>
            )}
          </div>
          
          {/* 出力ポート */}
          {nodeType.outputs.map((outputName, index) => (
            <div key={`output-${index}`} className="flex items-center justify-end">
              <span className="text-xs text-gray-600 font-medium mr-2">{outputName}</span>
              <div
                className={`port w-4 h-4 rounded-full cursor-pointer transition-all duration-200 ${
                  isConnecting && connectionStart?.nodeId === node.id && connectionStart?.portIndex === index
                    ? 'bg-blue-400 hover:bg-blue-500 shadow-lg'
                    : 'bg-gray-400 hover:bg-gray-600'
                }`}
                onClick={() => handlePortClick(node.id, index, true)}
                title={`出力: ${outputName}`}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 接続線をレンダリング
  const renderConnections = () => {
    console.log('接続線をレンダリング:', connections);
    
    return connections.map((conn, index) => {
      const fromNode = nodes.find(n => n.id === conn.from.nodeId)
      const toNode = nodes.find(n => n.id === conn.to.nodeId)
      
      if (!fromNode || !toNode) {
        console.log('ノードが見つかりません:', { fromNode, toNode, conn });
        return null;
      }

      // ポート位置を計算
      const nodeWidth = 160;
      const nodeHeight = 120;
      const portSize = 20;
      
      // 出力ポートの位置計算
      const fromNodeType = nodeTypes[fromNode.type];
      const fromPortIndex = conn.from.portIndex;
      const fromPortName = fromNodeType.outputs[fromPortIndex];
      
      const fromX = fromNode.x + nodeWidth; // ノード幅の右端
      const fromY = fromNode.y + 60 + (fromPortIndex * (portSize + 5));
      
      // 入力ポートの位置計算
      const toNodeType = nodeTypes[toNode.type];
      const toPortIndex = conn.to.portIndex;
      const toPortName = toNodeType.inputs[toPortIndex];
      
      const toX = toNode.x; // ノードの左端
      const toY = toNode.y + 60 + (toPortIndex * (portSize + 5));

      const controlOffset = Math.abs(toX - fromX) * 0.3;

      // 接続線の色を決定（ポートタイプに基づく）
      let strokeColor = '#3b82f6'; // デフォルト青
      let strokeOpacity = 0.8;
      
      if (fromPortName === 'true') {
        strokeColor = '#10b981'; // 緑（true）
      } else if (fromPortName === 'false') {
        strokeColor = '#ef4444'; // 赤（false）
      } else if (fromPortName === 'loop' || toPortName === 'loop') {
        strokeColor = '#8b5cf6'; // 紫（ループバック）
      }

      console.log('接続線の座標:', { fromX, fromY, toX, toY, fromPortName, toPortName });

      return (
        <svg
          key={conn.id || index}
          className="absolute pointer-events-none z-10"
          style={{ 
            left: 0, 
            top: 0, 
            width: '100%', 
            height: '100%',
            overflow: 'visible'
          }}
        >
          <defs>
            <linearGradient id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={strokeOpacity} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={strokeOpacity * 0.6} />
            </linearGradient>
            <filter id={`glow-${index}`}>
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <marker id={`arrowhead-${index}`} markerWidth="10" markerHeight="7" 
                    refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill={strokeColor} />
            </marker>
          </defs>
          <path
            d={`M ${fromX} ${fromY} C ${fromX + controlOffset} ${fromY} ${toX - controlOffset} ${toY} ${toX} ${toY}`}
            stroke={`url(#gradient-${index})`}
            strokeWidth="3"
            fill="none"
            filter={`url(#glow-${index})`}
            markerEnd={`url(#arrowhead-${index})`}
            className="transition-all duration-300"
          />
          {/* 接続線上のアニメーション点 */}
          <circle r="4" fill={strokeColor} className="opacity-80">
            <animateMotion
              dur="2s"
              repeatCount="indefinite"
              path={`M ${fromX} ${fromY} C ${fromX + controlOffset} ${fromY} ${toX - controlOffset} ${toY} ${toX} ${toY}`}
            />
          </circle>
          {/* ポートラベル表示 */}
          {fromPortName !== 'output' && (
            <text x={fromX - 5} y={fromY - 8} 
                  className="text-xs font-medium fill-gray-600" 
                  textAnchor="end">
              {fromPortName}
            </text>
          )}
        </svg>
      )
    })
  }

  return (
    <div className="flex h-full bg-gray-50">
      {/* メインキャンバスエリア */}
      <div className="flex-1 relative">
        <div 
          ref={canvasRef}
          className="w-full h-full relative cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onContextMenu={handleCanvasRightClick}
          onClick={(e) => {
            cancelConnection()
            closeContextMenu()
          }}
          style={{
            backgroundImage: 'radial-gradient(circle, #ccc 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        >
          {/* 接続線 */}
          {renderConnections()}
          
          {/* ノード */}
          {nodes.map(renderNode)}
          
          {/* 右クリックコンテキストメニュー */}
          {contextMenu && (
            <div 
              className="fixed bg-white rounded-lg shadow-lg border py-2 z-50 min-w-48"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              <div className="px-3 py-1 text-xs text-gray-500 border-b mb-1">ノードを追加</div>
              {Object.entries(nodeTypes).map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => addNodeFromContext(type)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center space-x-2 transition-colors"
                >
                  <span className="text-lg">{config.icon}</span>
                  <span className="text-sm">{config.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* プロパティパネル */}
      <div className="w-80 bg-white border-l overflow-y-auto">
        {/* ノードプロパティ */}
        {selectedNode ? (
          <div className="p-4">
            <h3 className="font-semibold mb-4 text-sm">ノードプロパティ</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">ノード名</label>
                <input
                  type="text"
                  value={selectedNode.data.label}
                  onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              {/* ノードタイプ別のプロパティ */}
              {selectedNode.type === 'input' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">デフォルト値</label>
                    <textarea
                      value={selectedNode.data.value || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { value: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">プレースホルダー</label>
                    <input
                      type="text"
                      value={selectedNode.data.placeholder || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { placeholder: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                </>
              )}

              {selectedNode.type === 'llm' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">プロンプト</label>
                    <textarea
                      value={selectedNode.data.prompt || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { prompt: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                      rows={5}
                      placeholder="プロンプトを入力してください"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Temperature</label>
                    <input
                      type="number"
                      value={selectedNode.data.temperature || 0.7}
                      onChange={(e) => updateNodeData(selectedNode.id, { temperature: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-md"
                      min="0"
                      max="2"
                      step="0.1"
                    />
                  </div>
                </>
              )}

              {selectedNode.type === 'if' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">条件タイプ</label>
                    <select
                      value={selectedNode.data.conditionType || 'llm'}
                      onChange={(e) => updateNodeData(selectedNode.id, { conditionType: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="llm">LLM判断</option>
                      <option value="variable">変数比較</option>
                    </select>
                  </div>
                  
                  {selectedNode.data.conditionType === 'llm' ? (
                    <div>
                      <label className="block text-sm font-medium mb-1">判断条件</label>
                      <textarea
                        value={selectedNode.data.condition || ''}
                        onChange={(e) => updateNodeData(selectedNode.id, { condition: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                        rows={3}
                        placeholder="LLMに判断させる条件を入力"
                      />
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-1">変数名</label>
                        <input
                          type="text"
                          value={selectedNode.data.variable || ''}
                          onChange={(e) => updateNodeData(selectedNode.id, { variable: e.target.value })}
                          className="w-full px-3 py-2 border rounded-md"
                          placeholder="比較する変数名"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">演算子</label>
                        <select
                          value={selectedNode.data.operator || '=='}
                          onChange={(e) => updateNodeData(selectedNode.id, { operator: e.target.value })}
                          className="w-full px-3 py-2 border rounded-md"
                        >
                          <option value="==">==(等しい)</option>
                          <option value="!=">!=(等しくない)</option>
                          <option value="<">&lt;(より小さい)</option>
                          <option value="<=">&lt;=(以下)</option>
                          <option value=">">&gt;(より大きい)</option>
                          <option value=">=">&gt;=(以上)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">比較値</label>
                        <input
                          type="text"
                          value={selectedNode.data.value || ''}
                          onChange={(e) => updateNodeData(selectedNode.id, { value: e.target.value })}
                          className="w-full px-3 py-2 border rounded-md"
                          placeholder="比較する値"
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              {selectedNode.type === 'while' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">条件タイプ</label>
                    <select
                      value={selectedNode.data.conditionType || 'variable'}
                      onChange={(e) => updateNodeData(selectedNode.id, { conditionType: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="variable">変数比較</option>
                      <option value="llm">LLM判断</option>
                    </select>
                  </div>
                  
                  {selectedNode.data.conditionType === 'variable' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-1">変数名</label>
                        <input
                          type="text"
                          value={selectedNode.data.variable || ''}
                          onChange={(e) => updateNodeData(selectedNode.id, { variable: e.target.value })}
                          className="w-full px-3 py-2 border rounded-md"
                          placeholder="比較する変数名"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">演算子</label>
                        <select
                          value={selectedNode.data.operator || '<'}
                          onChange={(e) => updateNodeData(selectedNode.id, { operator: e.target.value })}
                          className="w-full px-3 py-2 border rounded-md"
                        >
                          <option value="==">==(等しい)</option>
                          <option value="!=">!=(等しくない)</option>
                          <option value="<">&lt;(より小さい)</option>
                          <option value="<=">&lt;=(以下)</option>
                          <option value=">">&gt;(より大きい)</option>
                          <option value=">=">&gt;=(以上)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">比較値</label>
                        <input
                          type="text"
                          value={selectedNode.data.value || ''}
                          onChange={(e) => updateNodeData(selectedNode.id, { value: e.target.value })}
                          className="w-full px-3 py-2 border rounded-md"
                          placeholder="比較する値"
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium mb-1">継続条件</label>
                      <textarea
                        value={selectedNode.data.condition || ''}
                        onChange={(e) => updateNodeData(selectedNode.id, { condition: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                        rows={3}
                        placeholder="繰り返しを継続する条件を入力"
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">最大繰り返し回数</label>
                    <input
                      type="number"
                      value={selectedNode.data.maxIterations || 100}
                      onChange={(e) => updateNodeData(selectedNode.id, { maxIterations: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-md"
                      min="1"
                      max="1000"
                    />
                  </div>
                </>
              )}

              {selectedNode.type === 'output' && (
                <div>
                  <label className="block text-sm font-medium mb-1">出力形式</label>
                  <select
                    value={selectedNode.data.format || 'text'}
                    onChange={(e) => updateNodeData(selectedNode.id, { format: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="text">テキスト</option>
                    <option value="json">JSON</option>
                    <option value="markdown">Markdown</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div className="text-center text-gray-500 py-8">
              <div className="text-4xl mb-2">🎯</div>
              <div className="text-sm">ノードを選択してください</div>
              <div className="text-xs mt-1">右クリックでノードを追加できます</div>
            </div>
          </div>
        )}

        {/* 実行結果表示 */}
        {executionResult && (
          <div className="p-4 border-t">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">実行結果</h4>
                <button
                  onClick={() => setShowDebugLog(!showDebugLog)}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  {showDebugLog ? 'ログを隠す' : 'デバッグログ'}
                </button>
              </div>
              {executionResult.success ? (
                <div className="text-xs bg-green-50 border border-green-200 rounded p-2">
                  <div className="text-green-800 font-medium">実行成功</div>
                  {executionResult.variables && Object.keys(executionResult.variables).length > 0 && (
                    <div className="mt-2">
                      <div className="text-green-700">変数:</div>
                      <pre className="text-green-600 whitespace-pre-wrap">
                        {JSON.stringify(executionResult.variables, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs bg-red-50 border border-red-200 rounded p-2">
                  <div className="text-red-800 font-medium">実行エラー</div>
                  <div className="text-red-600 mt-1">{executionResult.error}</div>
                </div>
              )}
              
              {/* デバッグログ表示 */}
              {showDebugLog && debugLog.length > 0 && (
                <div className="mt-3 border-t pt-3">
                  <h5 className="font-medium text-xs text-gray-700 mb-2">デバッグログ</h5>
                  <div className="max-h-60 overflow-y-auto bg-gray-50 border rounded p-2 space-y-1">
                    {debugLog.map((log, index) => (
                      <div key={index} className="text-xs">
                        <div className="flex items-start space-x-2">
                          <span className={`
                            inline-block w-2 h-2 rounded-full mt-1 flex-shrink-0
                            ${log.level === 'error' ? 'bg-red-500' : 
                              log.level === 'success' ? 'bg-green-500' : 
                              log.level === 'info' ? 'bg-blue-500' : 'bg-gray-500'}
                          `}></span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-500 text-xs">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </span>
                              <span className={`
                                font-medium text-xs
                                ${log.level === 'error' ? 'text-red-700' : 
                                  log.level === 'success' ? 'text-green-700' : 
                                  log.level === 'info' ? 'text-blue-700' : 'text-gray-700'}
                              `}>
                                [{log.level.toUpperCase()}]
                              </span>
                              {log.nodeId && (
                                <span className="text-purple-600 text-xs bg-purple-100 px-1 rounded">
                                  {log.nodeId}
                                </span>
                              )}
                            </div>
                            <div className="text-gray-800 mt-1">{log.message}</div>
                            {log.data && (
                              <details className="mt-1">
                                <summary className="text-gray-600 cursor-pointer text-xs">詳細データ</summary>
                                <pre className="text-xs text-gray-600 mt-1 whitespace-pre-wrap bg-white p-1 rounded border">
                                  {JSON.stringify(log.data, null, 2)}
                                </pre>
                              </details>
                            )}
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
