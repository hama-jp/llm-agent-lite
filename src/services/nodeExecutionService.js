import llmService from './llmService.js'
import logService from './logService.js'
import StorageService from './storageService.js'
import { nodeTypes } from '../components/nodes/index.js'

class NodeExecutionService {
  constructor() {
    this.isExecuting = false
    this.executor = null
    this.executionContext = {}
    this.variables = {}
    this.executionLog = []
    this.debugMode = false
    this.currentRunId = null
    this.nodeTypes = nodeTypes
  }

  setDebugMode(enabled) {
    this.debugMode = enabled
  }

  addLog(level, message, nodeId = null, data = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      nodeId,
      data: this.debugMode ? data : null,
      variables: this.debugMode ? { ...this.variables } : null
    }
    
    // インメモリログ（既存機能との互換性のため保持）
    if (this.executionLog.length >= 500) {
      this.executionLog = this.executionLog.slice(-400);
    }
    this.executionLog.push(logEntry)
    
    // 永続化ログ（新機能）
    if (this.currentRunId && nodeId) {
      const nodeLogData = {
        runId: this.currentRunId,
        nodeId,
        status: level === 'error' ? 'failed' : level === 'success' ? 'completed' : 'running',
        inputs: data?.inputs || {},
        outputs: data?.result || data?.response || {},
        error: level === 'error' ? message : null
      }
      logService.addNodeLog(nodeLogData).catch(error => {
        console.error('ログ保存エラー:', error)
      })
    }
    
    if (this.debugMode) {
      console.log(`[${level}] ${message}`, data)
    }
  }

  getExecutionLog() {
    return this.executionLog
  }

  clearLog() {
    this.executionLog = []
  }

  // メモリ使用量最適化のためのクリーンアップ
  cleanup() {
    this.executionContext = {}
    this.variables = {}
    this.clearLog()
    this.isExecuting = false
    this.executor = null
    this.currentRunId = null
  }

  async startExecution(nodes, connections, inputData = {}, nodeTypes = {}) {
    if (this.isExecuting) {
      throw new Error('ワークフローが既に実行中です')
    }

    this.isExecuting = true
    this.executionContext = {}
    this.variables = { ...inputData }
    this.nodeTypes = nodeTypes
    this.clearLog()

    // ワークフロー実行の開始をログに記録
    const workflowId = StorageService.getCurrentWorkflowId() || 'default'
    this.currentRunId = await logService.createRun(workflowId, inputData)
    
    this.addLog('info', 'ワークフロー実行準備完了', null, {
      nodeCount: nodes.length,
      connectionCount: connections.length,
      inputData
    })

    try {
      const executionOrder = this.determineExecutionOrder(nodes, connections)
      this.addLog('info', '実行順序決定完了', null, { executionOrder })

      let currentIndex = -1

      this.executor = {
        _service: this,

        async next() {
          if (!this._service.isExecuting) {
            this._service.addLog('info', '実行が外部から停止されました')
            return { done: true, value: { status: 'stopped' } }
          }

          currentIndex++
          if (currentIndex >= executionOrder.length) {
            this._service.isExecuting = false
            this._service.addLog('success', 'ワークフロー実行完了')
            // ワークフロー実行の完了をログに更新
            if (this._service.currentRunId) {
              logService.updateRun(this._service.currentRunId, { status: 'completed' }).catch(console.error)
            }
            return { done: true, value: { status: 'completed', variables: this._service.variables } }
          }

          const nodeId = executionOrder[currentIndex]
          const node = nodes.find(n => n.id === nodeId)

          if (!node) {
            this._service.addLog('error', `ノードが見つかりません: ${nodeId}`)
            return this.next()
          }

          this._service.addLog('info', `ノード実行開始: ${node.data.label || node.type}`, nodeId, node.data)

          try {
            const result = await this._service.executeNode(node, nodes, connections)
            this._service.addLog('success', `ノード実行完了: ${node.data.label || node.type}`, nodeId, { result })

            return {
              done: false,
              value: {
                status: 'running',
                currentNodeId: nodeId,
                variables: this._service.variables,
                result: result
              }
            }
          } catch (error) {
            this._service.addLog('error', `ノード実行エラー: ${error.message}`, nodeId, { error: error.stack })
            this._service.isExecuting = false
            // ワークフロー実行のエラーをログに更新
            if (this._service.currentRunId) {
              logService.updateRun(this._service.currentRunId, { status: 'failed' }).catch(console.error)
            }
            return { done: true, value: { status: 'error', error, nodeId } }
          }
        },

        stop() {
          this._service.stopExecution()
        }
      }

      return this.executor

    } catch (error) {
      this.addLog('error', `ワークフロー実行準備エラー: ${error.message}`, null, { error: error.stack })
      this.isExecuting = false
      throw error
    }
  }

  stopExecution() {
    if (this.isExecuting) {
      this.addLog('info', 'ワークフロー実行停止が要求されました')
      this.isExecuting = false
      this.executor = null
      // ワークフロー実行の停止をログに更新
      if (this.currentRunId) {
        logService.updateRun(this.currentRunId, { status: 'stopped' }).catch(console.error)
        this.currentRunId = null
      }
    }
  }

  determineExecutionOrder(nodes, connections) {
    try {
      const graph = new Map()
      const inDegree = new Map()
      nodes.forEach(node => {
        graph.set(node.id, [])
        inDegree.set(node.id, 0)
      })
      connections.forEach(conn => {
        if (!graph.has(conn.from.nodeId) || !graph.has(conn.to.nodeId)) {
          throw new Error(`無効な接続: ${conn.from.nodeId} -> ${conn.to.nodeId}`)
        }
        graph.get(conn.from.nodeId).push(conn.to.nodeId)
        inDegree.set(conn.to.nodeId, inDegree.get(conn.to.nodeId) + 1)
      })
      const queue = []
      const result = []
      inDegree.forEach((degree, nodeId) => {
        if (degree === 0) {
          queue.push(nodeId)
        }
      })
      while (queue.length > 0) {
        const nodeId = queue.shift()
        result.push(nodeId)
        graph.get(nodeId).forEach(neighbor => {
          inDegree.set(neighbor, inDegree.get(neighbor) - 1)
          if (inDegree.get(neighbor) === 0) {
            queue.push(neighbor)
          }
        })
      }
      if (result.length !== nodes.length) {
        const unreachableNodes = nodes.filter(node => !result.includes(node.id))
        throw new Error(`ワークフローに循環参照があります。到達不可能なノード: ${unreachableNodes.map(n => n.data.label || n.id).join(', ')}`)
      }
      return result
    } catch (error) {
      this.addLog('error', `実行順序決定エラー: ${error.message}`)
      throw error
    }
  }

  async executeNode(node, nodes, connections) {
    const inputs = this.getNodeInputs(node, connections, nodes)
    let output

    // ノード定義から実行メソッドを取得
    const nodeDefinition = this.nodeTypes?.[node.type];
    if (nodeDefinition && typeof nodeDefinition.execute === 'function') {
      // 新しい方式：ノード定義に含まれた実行メソッドを使用
      const context = {
        variables: this.variables,
        addLog: this.addLog.bind(this)
      };
      output = await nodeDefinition.execute(node, inputs, context);
    } else {
      // 従来の方式：fallback for compatibility
      switch (node.type) {
        case 'if':
          output = await this.executeIfNode(node, inputs)
          break
        case 'while':
          output = await this.executeWhileNode(node, inputs, nodes, connections)
          break
        default:
          throw new Error(`未知のノードタイプ: ${node.type}`)
      }
    }
    
    this.executionContext[node.id] = output
    return output
  }

  async executeTextCombinerNode(node, inputs) {
    const orderedInputNames = this.nodeTypes[node.type]?.inputs || [];
    let combinedText = '';

    // 単純に順番に文字列を結合
    for (const inputName of orderedInputNames) {
      const inputValue = inputs[inputName];
      if (inputValue !== undefined && inputValue !== null) {
        combinedText += String(inputValue);
      }
    }

    this.addLog('info', `テキストを結合しました`, node.id, { result: combinedText });
    return combinedText;
  }

  getNodeInputs(node, connections, nodes) {
    const inputs = {};
    const nodeTypeDefinition = this.nodeTypes?.[node.type];

    if (!nodeTypeDefinition) {
      this.addLog('warn', `ノードタイプ定義が見つかりません: ${node.type}`, node.id);
      // Continue to gather inputs with fallback keys instead of returning empty
    }

    const inputConnections = connections.filter(conn => conn.to.nodeId === node.id);

    for (const conn of inputConnections) {
      const sourceOutput = this.executionContext[conn.from.nodeId];
      const sourceNode = nodes.find(n => n.id === conn.from.nodeId);

      if (sourceOutput !== undefined && sourceNode) {
        // Resolve input name with fallback to generic naming
        let inputName;
        if (nodeTypeDefinition?.inputs && nodeTypeDefinition.inputs[conn.to.portIndex]) {
          inputName = nodeTypeDefinition.inputs[conn.to.portIndex];
        } else if (conn.to?.name) {
          inputName = conn.to.name;
        } else {
          inputName = `input${conn.to.portIndex}`;
        }

        let valueToAssign;

        if (sourceNode.type === 'if') {
          // 'if' node output is an object { condition, true, false }
          // Port 0 ('true') or Port 1 ('false')
          this.addLog('debug', `If条件分岐から入力を取得中`, node.id, { 
            sourceOutput, 
            portIndex: conn.from.portIndex,
            sourceNodeId: sourceNode.id 
          });
          
          if (conn.from.portIndex === 0) {
            valueToAssign = sourceOutput.true;
          } else if (conn.from.portIndex === 1) {
            valueToAssign = sourceOutput.false;
          }
          
          this.addLog('debug', `If条件分岐からの値`, node.id, { 
            valueToAssign, 
            portIndex: conn.from.portIndex 
          });
        } else {
          valueToAssign = sourceOutput;
        }

        if (valueToAssign !== undefined) {
          // Warn if the same input name is being assigned multiple times
          if (inputs[inputName] !== undefined) {
            this.addLog('warn', `入力 '${inputName}' が複数の接続から供給されています`, node.id);
          }
          inputs[inputName] = valueToAssign;
        }
      }
    }
    
    // LLMノード専用の後処理：単一の入力を'input'キーで正規化
    if (node.type === 'llm') {
      const inputValues = Object.entries(inputs);
      if (inputValues.length === 1 && !Object.prototype.hasOwnProperty.call(inputs, 'input')) {
        // 単一の入力があるが、'input'キーではない場合
        const [originalKey, value] = inputValues[0];
        inputs.input = value;
        this.addLog('info', `LLMノード: 入力 '${originalKey}' を 'input' として正規化`, node.id);
      }
    }
    
    return inputs;
  }

  async executeInputNode(node) {
    if (node.data.inputType === 'file') {
      const value = node.data.fileContent || '';
      this.variables[node.id] = value;
      return value;
    }
    const value = node.data.value || ''
    this.variables[node.id] = value
    return value
  }

  async executeLLMNode(node, inputs) {
    const temperature = node.data.temperature || 0.7
    const model = node.data.model
    const provider = node.data.provider || 'openai' // ノード固有のプロバイダー
    const systemPrompt = node.data.systemPrompt || null
    
    // 入力をそのままLLMに送信（プロンプト機能なし）
    const inputValues = Object.values(inputs).filter(v => v !== undefined && v !== null);
    if (inputValues.length === 0) {
      throw new Error('LLMノードに入力がありません');
    }
    
    // 最初の入力値をプロンプトとして使用
    const finalPrompt = String(inputValues[0]);
    
    this.addLog('info', `LLMに送信するプロンプト: ${finalPrompt.substring(0, 100)}...`, node.id, { 
      prompt: finalPrompt,
      systemPrompt,
      model,
      temperature,
      provider
    });
    
    try {
      // 設定画面の情報を基本として、ノード固有のプロバイダーとモデル設定で上書き
      // APIキーやbaseURLは設定画面の値を使用し、プロバイダーとモデルのみノード固有値を使用
      const currentSettings = llmService.loadSettings();
      const nodeSpecificOptions = {
        provider,
        model,
        temperature,
        // 設定画面の認証情報を継承
        apiKey: currentSettings.apiKey,
        baseUrl: currentSettings.baseUrl,
        maxTokens: currentSettings.maxTokens
      };
      
      const response = await llmService.sendMessage(finalPrompt, systemPrompt, nodeSpecificOptions, { nodeId: node.id });
      this.addLog('info', `LLMレスポンス: ${response.substring(0, 100)}...`, node.id, { response });
      return response
    } catch (error) {
      this.addLog('error', `LLM実行エラー: ${error.message}`, node.id, { error: error.stack });
      throw new Error(`LLM実行エラー: ${error.message}`)
    }
  }

  async executeIfNode(node, inputs) {
    const conditionType = node.data.conditionType || 'llm'
    let conditionResult = false
    if (conditionType === 'llm') {
      const condition = node.data.condition || ''
      const inputValue = inputs.input || ''
      const prompt = `${condition}\n\n入力: ${inputValue}\n\n上記の条件に基づいて、入力が条件を満たすかどうかを判断してください。満たす場合は「true」、満たさない場合は「false」のみを回答してください。`
      try {
        const model = node.data.model
        const temperature = node.data.temperature
        const provider = node.data.provider || 'openai' // ノード固有のプロバイダー

        // 設定画面の情報を基本として、ノード固有のプロバイダー設定で上書き
        const currentSettings = llmService.loadSettings();
        const nodeSpecificOptions = {
          provider,
          model,
          temperature,
          // 設定画面の認証情報を継承
          apiKey: currentSettings.apiKey,
          baseUrl: currentSettings.baseUrl,
          maxTokens: currentSettings.maxTokens
        };
        
        const response = await llmService.sendMessage(prompt, nodeSpecificOptions)
        conditionResult = response.toLowerCase().includes('true')
      } catch (error) {
        throw new Error(`条件判断エラー: ${error.message}`)
      }
    } else {
      const variable = node.data.variable || ''
      const operator = node.data.operator || '=='
      const value = node.data.value || ''
      const variableValue = this.variables[variable]
      if (variableValue === undefined) {
        throw new Error(`変数 '${variable}' が見つかりません`)
      }
      conditionResult = this.evaluateCondition(variableValue, operator, value)
    }
    return {
      condition: conditionResult,
      true: conditionResult ? (inputs.input || null) : null,
      false: !conditionResult ? (inputs.input || null) : null,
    }
  }

  async executeWhileNode(node, inputs) {
    const conditionType = node.data.conditionType || 'variable'
    const maxIterations = node.data.maxIterations || 100
    const results = []
    let iteration = 0
    if (conditionType === 'variable') {
      const variable = node.data.variable || 'counter'
      if (this.variables[variable] === undefined) {
        this.variables[variable] = 0
      }
    }
    while (iteration < maxIterations) {
      let shouldContinue = false
      if (conditionType === 'variable') {
        const variable = node.data.variable || 'counter'
        const operator = node.data.operator || '<'
        const value = node.data.value || '10'
        const variableValue = this.variables[variable]
        shouldContinue = this.evaluateCondition(variableValue, operator, value)
      } else {
        const condition = node.data.condition || ''
        const inputValue = inputs.input || ''
        const prompt = `${condition}\n\n現在の状況: ${inputValue}\n反復回数: ${iteration}\n\n上記の条件に基づいて、処理を続行するかどうかを判断してください。続行する場合は「true」、停止する場合は「false」のみを回答してください。`
        try {
          const response = await llmService.sendMessage(prompt, { temperature: 0 })
          shouldContinue = response.toLowerCase().includes('true')
        } catch (error) {
          throw new Error(`While条件判断エラー: ${error.message}`)
        }
      }
      if (!shouldContinue) {
        break
      }
      results.push({
        iteration: iteration,
        input: inputs.input,
        variables: { ...this.variables }
      })
      if (conditionType === 'variable') {
        const variable = node.data.variable || 'counter'
        this.variables[variable] = (this.variables[variable] || 0) + 1
      }
      iteration++
    }
    return {
      iterations: iteration,
      results: results,
      output: inputs.input
    }
  }

  async executeOutputNode(node, inputs) {
    const format = node.data.format || 'text'
    // Get the first available input value, or fallback to empty string
    const inputValue = Object.values(inputs)[0] || ''
    switch (format) {
      case 'json':
        try {
          return JSON.stringify({ output: inputValue }, null, 2)
        } catch {
          return inputValue
        }
      case 'markdown':
        return `# 出力結果\n\n${inputValue}`
      default:
        return inputValue
    }
  }

  evaluateCondition(leftValue, operator, rightValue) {
    const leftNum = parseFloat(leftValue)
    const rightNum = parseFloat(rightValue)
    if (!isNaN(leftNum) && !isNaN(rightNum)) {
      switch (operator) {
        case '<': return leftNum < rightNum
        case '<=': return leftNum <= rightNum
        case '>': return leftNum > rightNum
        case '>=': return leftNum >= rightNum
        case '==': return leftNum === rightNum
        case '!=': return leftNum !== rightNum
        default: return false
      }
    } else {
      switch (operator) {
        case '==': return leftValue === rightValue
        case '!=': return leftValue !== rightValue
        case '<': return leftValue < rightValue
        case '<=': return leftValue <= rightValue
        case '>': return leftValue > rightValue
        case '>=': return leftValue >= rightValue
        default: return false
      }
    }
  }

  isRunning() {
    return this.isExecuting
  }

  async executeVariableSetNode(node, inputs) {
    const variableName = node.data.variableName || ''
    if (!variableName) {
      throw new Error('変数名が設定されていません')
    }

    let value
    if (node.data.useInput) {
      // 接続からの入力を使用
      const inputValues = Object.values(inputs).filter(v => v !== undefined && v !== null);
      if (inputValues.length === 0) {
        throw new Error('変数設定ノードに入力がありません');
      }
      value = String(inputValues[0]);
    } else {
      // 直接入力された値を使用
      value = node.data.value || ''
    }

    this.variables[variableName] = value
    this.addLog('info', `変数 '${variableName}' に値を設定: ${value}`, node.id, { variableName, value })
    
    // パススルー: 入力値または設定値をそのまま出力
    return node.data.useInput ? value : value
  }

}

export default new NodeExecutionService()
