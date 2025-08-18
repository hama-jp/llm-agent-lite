import { useState, useRef, useCallback } from 'react'
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
  const [executionError, setExecutionError] = useState(null)
  const canvasRef = useRef(null)

  // ノードタイプの定義
  const nodeTypes = {
    input: {
      name: '📥 入力',
      icon: '📥',
      color: 'bg-gradient-to-br from-orange-400 to-orange-600',
      borderColor: 'border-orange-300',
      textColor: 'text-white',
      inputs: [],
      outputs: ['output'],
      defaultData: { value: '', placeholder: '入力値を設定してください' }
    },
    llm: {
      name: '🤖 LLM生成',
      icon: '🤖',
      color: 'bg-gradient-to-br from-blue-400 to-blue-600',
      borderColor: 'border-blue-300',
      textColor: 'text-white',
      inputs: ['input'],
      outputs: ['output'],
      defaultData: { 
        prompt: 'あなたは優秀なアシスタントです。以下の入力に対して適切に回答してください。\n\n入力: {{input}}', 
        temperature: 0.7,
        model: 'default',
        streaming: false
      }
    },
    if: {
      name: '🔀 If条件分岐',
      icon: '🔀',
      color: 'bg-gradient-to-br from-pink-400 to-pink-600',
      borderColor: 'border-pink-300',
      textColor: 'text-white',
      inputs: ['input'],
      outputs: ['true', 'false'],
      defaultData: { 
        conditionType: 'llm', 
        condition: '入力が肯定的な内容かどうか判断してください', 
        variable: '', 
        operator: '==', 
        value: '',
        multipleConditions: []
      }
    },
    while: {
      name: '🔄 While繰り返し',
      icon: '🔄',
      color: 'bg-gradient-to-br from-purple-400 to-purple-600',
      borderColor: 'border-purple-300',
      textColor: 'text-white',
      inputs: ['input'],
      outputs: ['output'],
      defaultData: { conditionType: 'variable', condition: '', variable: 'counter', operator: '<', value: '10', maxIterations: 100 }
    },
    output: {
      name: '📤 出力',
      icon: '📤',
      color: 'bg-gradient-to-br from-green-400 to-green-600',
      borderColor: 'border-green-300',
      textColor: 'text-white',
      inputs: ['input'],
      outputs: [],
      defaultData: { format: 'text', title: '結果' }
    }
  }

  // ノードを追加
  const addNode = (type) => {
    const nodeType = nodeTypes[type]
    const newNode = {
      id: `${type}_${Date.now()}`,
      type,
      position: { x: 100, y: 100 },
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
    const rect = canvasRef.current.getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left - node.position.x,
      y: e.clientY - rect.top - node.position.y
    })
  }

  const handleMouseMove = useCallback((e) => {
    if (draggedNode) {
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

  // ポート接続
  const handlePortClick = (nodeId, portIndex, isOutput) => {
    if (isConnecting) {
      if (connectionStart && !isOutput && connectionStart.nodeId !== nodeId) {
        // 接続を作成
        const newConnection = {
          from: connectionStart,
          to: { nodeId, portIndex }
        }
        setConnections(prev => [...prev, newConnection])
      }
      setIsConnecting(false)
      setConnectionStart(null)
    } else if (isOutput) {
      setIsConnecting(true)
      setConnectionStart({ nodeId, portIndex })
    }
  }

  // 接続をキャンセル
  const cancelConnection = () => {
    setIsConnecting(false)
    setConnectionStart(null)
  }

  // ワークフローを実行
  const executeWorkflow = async () => {
    if (nodes.length === 0) {
      setExecutionError('実行するノードがありません')
      return
    }

    setIsExecuting(true)
    setExecutionProgress(null)
    setExecutionResult(null)
    setExecutionError(null)

    try {
      // 入力ノードから初期データを取得
      const inputNodes = nodes.filter(node => node.type === 'input')
      const inputData = {}
      inputNodes.forEach(node => {
        inputData[node.id] = node.data.value || ''
      })

      const result = await nodeExecutionService.executeWorkflow(
        nodes,
        connections,
        inputData,
        (progress) => {
          setExecutionProgress(progress)
        }
      )

      setExecutionResult(result)
    } catch (error) {
      setExecutionError(error.message)
    } finally {
      setIsExecuting(false)
      setExecutionProgress(null)
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
      id: `workflow_${Date.now()}`,
      name: 'ノードワークフロー',
      nodes,
      connections,
      createdAt: new Date().toISOString()
    }

    const savedWorkflows = JSON.parse(localStorage.getItem('nodeWorkflows') || '[]')
    savedWorkflows.push(workflow)
    localStorage.setItem('nodeWorkflows', JSON.stringify(savedWorkflows))
    
    alert('ワークフローを保存しました')
  }

  // ワークフローをエクスポート
  const exportWorkflow = () => {
    const workflow = {
      nodes,
      connections,
      exportedAt: new Date().toISOString()
    }

    const dataStr = JSON.stringify(workflow, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `workflow_${Date.now()}.json`
    link.click()
    
    URL.revokeObjectURL(url)
  }

  // ワークフローをインポート
  const importWorkflow = (event) => {
    const file = event.target.files[0]
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
    
    // ファイル入力をリセット
    event.target.value = ''
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
    const isSelected = selectedNode?.id === node.id
    const isExecuting = executionProgress?.nodeId === node.id
    const hasError = executionError && executionProgress?.nodeId === node.id

    return (
      <div
        key={node.id}
        className={`absolute bg-white border-2 rounded-lg shadow-lg cursor-move min-w-40 transition-all duration-200 hover:shadow-xl ${
          isSelected ? `${nodeType.borderColor} border-4 shadow-2xl` : 'border-gray-300'
        } ${isExecuting ? 'animate-pulse' : ''} ${hasError ? 'border-red-500' : ''}`}
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
          {nodeType.inputs.map((input, index) => (
            <div key={`input-${index}`} className="flex items-center">
              <div
                className={`port w-4 h-4 rounded-full cursor-pointer transition-all duration-200 mr-2 ${
                  isConnecting && connectionStart?.nodeId !== node.id 
                    ? 'bg-green-400 hover:bg-green-500 shadow-lg' 
                    : 'bg-gray-400 hover:bg-gray-600'
                }`}
                onClick={() => handlePortClick(node.id, index, false)}
                title={`入力: ${input}`}
              />
              <span className="text-xs text-gray-600 font-medium">{input}</span>
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
          {nodeType.outputs.map((output, index) => (
            <div key={`output-${index}`} className="flex items-center justify-end">
              <span className="text-xs text-gray-600 font-medium mr-2">{output}</span>
              <div
                className={`port w-4 h-4 rounded-full cursor-pointer transition-all duration-200 ${
                  isConnecting && connectionStart?.nodeId === node.id && connectionStart?.isOutput
                    ? 'bg-blue-400 hover:bg-blue-500 shadow-lg'
                    : 'bg-gray-400 hover:bg-gray-600'
                }`}
                onClick={() => handlePortClick(node.id, index, true)}
                title={`出力: ${output}`}
              />
            </div>
          ))}
        </div>
        
        {/* 実行状態インジケーター */}
        {isExecuting && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-ping"></div>
        )}
        {hasError && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
        )}
      </div>
    )
  }

  // 接続線をレンダリング
  const renderConnections = () => {
    return connections.map((conn, index) => {
      const fromNode = nodes.find(n => n.id === conn.from.nodeId)
      const toNode = nodes.find(n => n.id === conn.to.nodeId)
      
      if (!fromNode || !toNode) return null

      const fromX = fromNode.position.x + 128 // ノード幅の右端
      const fromY = fromNode.position.y + 60 + (conn.from.portIndex * 20)
      const toX = toNode.position.x
      const toY = toNode.position.y + 60 + (conn.to.portIndex * 20)

      return (
        <svg
          key={index}
          className="absolute pointer-events-none"
          style={{ left: 0, top: 0, width: '100%', height: '100%' }}
        >
          <path
            d={`M ${fromX} ${fromY} C ${fromX + 50} ${fromY} ${toX - 50} ${toY} ${toX} ${toY}`}
            stroke="#666"
            strokeWidth="2"
            fill="none"
          />
        </svg>
      )
    })
  }

  return (
    <div className="flex h-full">
      {/* ツールパレット */}
      <div className="w-64 bg-white border-r p-4 overflow-y-auto">
        <h3 className="font-semibold mb-4">ノード</h3>
        
        {Object.entries(nodeTypes).map(([type, config]) => (
          <Button
            key={type}
            variant="outline"
            className="w-full mb-2 justify-start"
            onClick={() => addNode(type)}
          >
            {config.name}
          </Button>
        ))}
        
        <div className="pt-4 border-t space-y-2">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={saveWorkflow}
            disabled={nodes.length === 0}
          >
            <Save className="h-4 w-4 mr-2" />
            保存
          </Button>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={exportWorkflow}
            disabled={nodes.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            エクスポート
          </Button>
          <label className="block">
            <Button variant="outline" className="w-full" asChild>
              <span>
                <Upload className="h-4 w-4 mr-2" />
                インポート
              </span>
            </Button>
            <input
              type="file"
              accept=".json"
              onChange={importWorkflow}
              className="hidden"
            />
          </label>
          {isExecuting ? (
            <Button 
              className="w-full" 
              variant="destructive"
              onClick={stopExecution}
            >
              <Square className="h-4 w-4 mr-2" />
              停止
            </Button>
          ) : (
            <Button 
              className="w-full"
              onClick={executeWorkflow}
              disabled={nodes.length === 0}
            >
              <Play className="h-4 w-4 mr-2" />
              実行
            </Button>
          )}
        </div>
      </div>

      {/* キャンバス */}
      <div className="flex-1 relative overflow-hidden bg-gray-50">
        {/* 実行状態表示 */}
        {(executionProgress || executionResult || executionError) && (
          <div className="absolute top-4 left-4 right-4 z-10 space-y-2">
            {executionProgress && (
              <Alert className="border-blue-200 bg-blue-50">
                <AlertDescription className="text-blue-800">
                  <div className="flex items-center justify-between mb-2">
                    <span>実行中: {executionProgress.nodeName || 'ワークフロー'}</span>
                    <span>{executionProgress.step}/{executionProgress.total}</span>
                  </div>
                  <Progress 
                    value={(executionProgress.step / executionProgress.total) * 100} 
                    className="w-full"
                  />
                </AlertDescription>
              </Alert>
            )}
            
            {executionResult && (
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-800">
                  <strong>実行完了!</strong>
                  <details className="mt-2">
                    <summary className="cursor-pointer">結果を表示</summary>
                    <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto max-h-32">
                      {JSON.stringify(executionResult, null, 2)}
                    </pre>
                  </details>
                </AlertDescription>
              </Alert>
            )}
            
            {executionError && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">
                  <strong>実行エラー:</strong> {executionError}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div
          ref={canvasRef}
          className="w-full h-full relative"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={cancelConnection}
          style={{
            backgroundImage: 'radial-gradient(circle, #ccc 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        >
          {/* 接続線 */}
          {renderConnections()}
          
          {/* ノード */}
          {nodes.map(renderNode)}
        </div>
      </div>

      {/* プロパティパネル */}
      {selectedNode && (
        <div className="w-80 bg-white border-l p-4 overflow-y-auto">
          <h3 className="font-semibold mb-4">プロパティ</h3>
          
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
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={6}
                    placeholder="プロンプトを入力してください。{{input}}で入力値を参照できます。"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    使用可能な変数: {{input}}, {{variable_name}}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">モデル</label>
                  <select
                    value={selectedNode.data.model || 'default'}
                    onChange={(e) => updateNodeData(selectedNode.id, { model: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="default">デフォルト</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    <option value="gpt-4">GPT-4</option>
                    <option value="claude-3-haiku">Claude 3 Haiku</option>
                    <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    温度 (Temperature): {selectedNode.data.temperature || 0.7}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={selectedNode.data.temperature || 0.7}
                    onChange={(e) => updateNodeData(selectedNode.id, { temperature: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>保守的 (0)</span>
                    <span>創造的 (2)</span>
                  </div>
                </div>
                
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedNode.data.streaming || false}
                      onChange={(e) => updateNodeData(selectedNode.id, { streaming: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm font-medium">ストリーミング出力</span>
                  </label>
                  <div className="text-xs text-gray-500 mt-1">
                    リアルタイムで出力を表示します
                  </div>
                </div>
                
                {/* プロンプトテンプレート */}
                <div>
                  <label className="block text-sm font-medium mb-1">プロンプトテンプレート</label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        updateNodeData(selectedNode.id, { prompt: e.target.value })
                      }
                    }}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    defaultValue=""
                  >
                    <option value="">テンプレートを選択...</option>
                    <option value="あなたは優秀なアシスタントです。以下の入力に対して適切に回答してください。\n\n入力: {{input}}">
                      基本アシスタント
                    </option>
                    <option value="以下のテキストを要約してください。重要なポイントを3つ以内で簡潔にまとめてください。\n\nテキスト: {{input}}">
                      要約
                    </option>
                    <option value="以下のテキストを日本語に翻訳してください。\n\nテキスト: {{input}}">
                      翻訳
                    </option>
                    <option value="以下のコードを解説してください。何をしているか、どのように動作するかを説明してください。\n\nコード: {{input}}">
                      コード解説
                    </option>
                  </select>
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
                    <label className="block text-sm font-medium mb-1">条件</label>
                    <textarea
                      value={selectedNode.data.condition || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { condition: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                      rows={3}
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
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">演算子</label>
                      <select
                        value={selectedNode.data.operator || '=='}
                        onChange={(e) => updateNodeData(selectedNode.id, { operator: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="==">=</option>
                        <option value="!=">!=</option>
                        <option value="<">&lt;</option>
                        <option value="<=">&lt;=</option>
                        <option value=">">&gt;</option>
                        <option value=">=">&gt;=</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">比較値</label>
                      <input
                        type="text"
                        value={selectedNode.data.value || ''}
                        onChange={(e) => updateNodeData(selectedNode.id, { value: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
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
                        value={selectedNode.data.variable || 'counter'}
                        onChange={(e) => updateNodeData(selectedNode.id, { variable: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">演算子</label>
                      <select
                        value={selectedNode.data.operator || '<'}
                        onChange={(e) => updateNodeData(selectedNode.id, { operator: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="<">&lt;</option>
                        <option value="<=">&lt;=</option>
                        <option value=">">&gt;</option>
                        <option value=">=">&gt;=</option>
                        <option value="==">=</option>
                        <option value="!=">!=</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">比較値</label>
                      <input
                        type="text"
                        value={selectedNode.data.value || '10'}
                        onChange={(e) => updateNodeData(selectedNode.id, { value: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-sm font-medium mb-1">条件</label>
                    <textarea
                      value={selectedNode.data.condition || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { condition: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md"
                      rows={3}
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium mb-1">最大反復回数</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={selectedNode.data.maxIterations || 100}
                    onChange={(e) => updateNodeData(selectedNode.id, { maxIterations: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-md"
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
      )}
    </div>
  )
}

export default NodeEditor

