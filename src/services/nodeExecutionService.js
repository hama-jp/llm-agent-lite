import llmService from './llmService.js'

class NodeExecutionService {
  constructor() {
    this.isExecuting = false
    this.executor = null
    this.executionContext = {}
    this.variables = {}
    this.executionLog = []
    this.debugMode = false
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
      data: this.debugMode ? data : null, // デバッグ時のみデータ保存
      variables: this.debugMode ? { ...this.variables } : null // デバッグ時のみ変数コピー
    }
    
    // ログサイズ制限（最大500エントリー）
    if (this.executionLog.length >= 500) {
      this.executionLog = this.executionLog.slice(-400); // 古い100エントリーを削除
    }
    
    this.executionLog.push(logEntry)
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
  }

  startExecution(nodes, connections, inputData = {}, nodeTypes = {}) {
    if (this.isExecuting) {
      throw new Error('ワークフローが既に実行中です')
    }

    this.isExecuting = true
    this.executionContext = {}
    this.variables = { ...inputData }
    this.nodeTypes = nodeTypes // Store node types
    this.clearLog()
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
    switch (node.type) {
      case 'input':
        output = await this.executeInputNode(node, inputs)
        break
      case 'llm':
        output = await this.executeLLMNode(node, inputs)
        break
      case 'if':
        output = await this.executeIfNode(node, inputs)
        break
      case 'while':
        output = await this.executeWhileNode(node, inputs, nodes, connections)
        break
      case 'output':
        output = await this.executeOutputNode(node, inputs)
        break
      case 'text_combiner':
        output = await this.executeTextCombinerNode(node, inputs)
        break
      default:
        throw new Error(`未知のノードタイプ: ${node.type}`)
    }
    this.executionContext[node.id] = output
    return output
  }

  async executeTextCombinerNode(node, inputs) {
    const orderedInputNames = this.nodeTypes[node.type]?.inputs || [];
    let combinedText = '';

    for (const inputName of orderedInputNames) {
      const inputValue = inputs[inputName];
      if (inputValue !== undefined && inputValue !== null) {
        // Since all node outputs are normalized to strings or simple types,
        // we can safely convert to string here.
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
          if (conn.from.portIndex === 0 && sourceOutput.condition) {
            valueToAssign = sourceOutput.true;
          } else if (conn.from.portIndex === 1 && !sourceOutput.condition) {
            valueToAssign = sourceOutput.false;
          }
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
    const prompt = node.data.prompt || ''
    const temperature = node.data.temperature || 0.7
    const model = node.data.model
    let finalPrompt = prompt
    Object.entries(inputs).forEach(([key, value]) => {
      finalPrompt = finalPrompt.replace(new RegExp(`{{${key}}}`, 'g'), value)
    })
    Object.entries(this.variables).forEach(([key, value]) => {
      finalPrompt = finalPrompt.replace(new RegExp(`{{${key}}}`, 'g'), value)
    })
    try {
      const response = await llmService.sendMessage(finalPrompt, { temperature, model })
      return response
    } catch (error) {
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
        const response = await llmService.sendMessage(prompt, { model, temperature })
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
}

export default new NodeExecutionService()
