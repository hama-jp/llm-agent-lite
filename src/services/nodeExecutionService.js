import llmService from './llmService.js'

class NodeExecutionService {
  constructor() {
    this.isExecuting = false
    this.executionContext = {}
    this.variables = {}
  }

  // ワークフローを実行
  async executeWorkflow(nodes, connections, inputData = {}, onProgress = null) {
    if (this.isExecuting) {
      throw new Error('ワークフローが既に実行中です')
    }

    this.isExecuting = true
    this.executionContext = {}
    this.variables = { ...inputData }

    try {
      // 実行順序を決定
      const executionOrder = this.determineExecutionOrder(nodes, connections)
      
      if (onProgress) {
        onProgress({ step: 0, total: executionOrder.length, status: 'starting' })
      }

      // ノードを順次実行
      for (let i = 0; i < executionOrder.length; i++) {
        const nodeId = executionOrder[i]
        const node = nodes.find(n => n.id === nodeId)
        
        if (!node) continue

        if (onProgress) {
          onProgress({ 
            step: i + 1, 
            total: executionOrder.length, 
            status: 'running',
            nodeId: nodeId,
            nodeName: node.data.label
          })
        }

        try {
          await this.executeNode(node, nodes, connections)
        } catch (error) {
          if (onProgress) {
            onProgress({ 
              step: i + 1, 
              total: executionOrder.length, 
              status: 'error',
              nodeId: nodeId,
              error: error.message
            })
          }
          throw error
        }
      }

      if (onProgress) {
        onProgress({ step: executionOrder.length, total: executionOrder.length, status: 'completed' })
      }

      return {
        success: true,
        variables: this.variables,
        executionContext: this.executionContext
      }

    } finally {
      this.isExecuting = false
    }
  }

  // 実行順序を決定（トポロジカルソート）
  determineExecutionOrder(nodes, connections) {
    const graph = new Map()
    const inDegree = new Map()

    // グラフを構築
    nodes.forEach(node => {
      graph.set(node.id, [])
      inDegree.set(node.id, 0)
    })

    connections.forEach(conn => {
      graph.get(conn.from.nodeId).push(conn.to.nodeId)
      inDegree.set(conn.to.nodeId, inDegree.get(conn.to.nodeId) + 1)
    })

    // トポロジカルソート
    const queue = []
    const result = []

    // 入次数が0のノードをキューに追加
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

    // 循環参照チェック
    if (result.length !== nodes.length) {
      throw new Error('ワークフローに循環参照があります')
    }

    return result
  }

  // 単一ノードを実行
  async executeNode(node, nodes, connections) {
    const inputs = this.getNodeInputs(node, connections)
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
      default:
        throw new Error(`未知のノードタイプ: ${node.type}`)
    }

    // 実行結果を保存
    this.executionContext[node.id] = output
    return output
  }

  // ノードの入力値を取得
  getNodeInputs(node, connections) {
    const inputs = {}
    
    connections
      .filter(conn => conn.to.nodeId === node.id)
      .forEach(conn => {
        const sourceOutput = this.executionContext[conn.from.nodeId]
        if (sourceOutput !== undefined) {
          inputs[conn.to.portIndex || 'input'] = sourceOutput
        }
      })

    return inputs
  }

  // 入力ノードを実行
  async executeInputNode(node, inputs) {
    const value = node.data.value || ''
    this.variables[node.id] = value
    return value
  }

  // LLMノードを実行
  async executeLLMNode(node, inputs) {
    const prompt = node.data.prompt || ''
    const temperature = node.data.temperature || 0.7
    
    // 入力値をプロンプトに組み込み
    let finalPrompt = prompt
    Object.entries(inputs).forEach(([key, value]) => {
      finalPrompt = finalPrompt.replace(new RegExp(`{{${key}}}`, 'g'), value)
    })

    // 変数をプロンプトに組み込み
    Object.entries(this.variables).forEach(([key, value]) => {
      finalPrompt = finalPrompt.replace(new RegExp(`{{${key}}}`, 'g'), value)
    })

    try {
      const response = await llmService.generateText(finalPrompt, { temperature })
      return response
    } catch (error) {
      throw new Error(`LLM実行エラー: ${error.message}`)
    }
  }

  // If条件分岐ノードを実行
  async executeIfNode(node, inputs) {
    const conditionType = node.data.conditionType || 'llm'
    let conditionResult = false

    if (conditionType === 'llm') {
      // LLMによる判断
      const condition = node.data.condition || ''
      const inputValue = inputs.input || ''
      
      const prompt = `${condition}\n\n入力: ${inputValue}\n\n上記の条件に基づいて、入力が条件を満たすかどうかを判断してください。満たす場合は「true」、満たさない場合は「false」のみを回答してください。`
      
      try {
        const response = await llmService.generateText(prompt, { temperature: 0 })
        conditionResult = response.toLowerCase().includes('true')
      } catch (error) {
        throw new Error(`条件判断エラー: ${error.message}`)
      }
    } else {
      // 変数による比較
      const variable = node.data.variable || ''
      const operator = node.data.operator || '=='
      const value = node.data.value || ''
      
      const variableValue = this.variables[variable]
      if (variableValue === undefined) {
        throw new Error(`変数 '${variable}' が見つかりません`)
      }

      conditionResult = this.evaluateCondition(variableValue, operator, value)
    }

    // 条件結果に基づいて出力を決定
    return {
      condition: conditionResult,
      true: conditionResult ? inputs.input : null,
      false: !conditionResult ? inputs.input : null
    }
  }

  // While繰り返しノードを実行
  async executeWhileNode(node, inputs, nodes, connections) {
    const conditionType = node.data.conditionType || 'variable'
    const maxIterations = node.data.maxIterations || 100
    const results = []
    let iteration = 0

    // カウンター変数を初期化
    if (conditionType === 'variable') {
      const variable = node.data.variable || 'counter'
      if (this.variables[variable] === undefined) {
        this.variables[variable] = 0
      }
    }

    while (iteration < maxIterations) {
      let shouldContinue = false

      if (conditionType === 'variable') {
        // 変数による条件判断
        const variable = node.data.variable || 'counter'
        const operator = node.data.operator || '<'
        const value = node.data.value || '10'
        
        const variableValue = this.variables[variable]
        shouldContinue = this.evaluateCondition(variableValue, operator, value)
      } else {
        // LLMによる条件判断
        const condition = node.data.condition || ''
        const inputValue = inputs.input || ''
        
        const prompt = `${condition}\n\n現在の状況: ${inputValue}\n反復回数: ${iteration}\n\n上記の条件に基づいて、処理を続行するかどうかを判断してください。続行する場合は「true」、停止する場合は「false」のみを回答してください。`
        
        try {
          const response = await llmService.generateText(prompt, { temperature: 0 })
          shouldContinue = response.toLowerCase().includes('true')
        } catch (error) {
          throw new Error(`While条件判断エラー: ${error.message}`)
        }
      }

      if (!shouldContinue) {
        break
      }

      // ループ内の処理を実行（簡略化）
      results.push({
        iteration: iteration,
        input: inputs.input,
        variables: { ...this.variables }
      })

      // カウンター変数を更新
      if (conditionType === 'variable') {
        const variable = node.data.variable || 'counter'
        this.variables[variable] = (this.variables[variable] || 0) + 1
      }

      iteration++
    }

    return {
      iterations: iteration,
      results: results,
      output: inputs.input // 最終的な出力
    }
  }

  // 出力ノードを実行
  async executeOutputNode(node, inputs) {
    const format = node.data.format || 'text'
    const inputValue = inputs.input || ''

    switch (format) {
      case 'json':
        try {
          return JSON.stringify({ output: inputValue }, null, 2)
        } catch (error) {
          return inputValue
        }
      case 'markdown':
        return `# 出力結果\n\n${inputValue}`
      default:
        return inputValue
    }
  }

  // 条件を評価
  evaluateCondition(leftValue, operator, rightValue) {
    // 数値として比較を試行
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
      // 文字列として比較
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

  // 実行を停止
  stopExecution() {
    this.isExecuting = false
  }

  // 実行状態を取得
  isRunning() {
    return this.isExecuting
  }
}

export default new NodeExecutionService()

