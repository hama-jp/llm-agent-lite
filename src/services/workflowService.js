// ワークフローサービス
import llmService from './llmService.js'

class WorkflowService {
  constructor() {
    this.workflows = this.loadWorkflows()
  }

  // ワークフローをローカルストレージから読み込み
  loadWorkflows() {
    const saved = localStorage.getItem('llm-agent-workflows')
    return saved ? JSON.parse(saved) : [
      {
        id: 1,
        name: 'テキスト要約',
        description: '長いテキストを簡潔に要約します',
        steps: [
          {
            id: 1,
            type: 'prompt',
            name: 'テキスト入力',
            prompt: '以下のテキストを要約してください：\n\n{{input}}'
          }
        ],
        status: 'active',
        createdAt: new Date().toISOString(),
        lastRun: null
      },
      {
        id: 2,
        name: '翻訳ワークフロー',
        description: '日本語から英語への翻訳を行います',
        steps: [
          {
            id: 1,
            type: 'prompt',
            name: '言語検出',
            prompt: '以下のテキストの言語を検出してください：\n\n{{input}}'
          },
          {
            id: 2,
            type: 'prompt',
            name: '翻訳処理',
            prompt: '以下のテキストを英語に翻訳してください：\n\n{{input}}'
          },
          {
            id: 3,
            type: 'prompt',
            name: '品質チェック',
            prompt: '以下の翻訳の品質をチェックし、改善点があれば指摘してください：\n\n{{step2_output}}'
          }
        ],
        status: 'draft',
        createdAt: new Date().toISOString(),
        lastRun: null
      }
    ]
  }

  // ワークフローを保存
  saveWorkflows() {
    localStorage.setItem('llm-agent-workflows', JSON.stringify(this.workflows))
  }

  // 全ワークフローを取得
  getAllWorkflows() {
    return this.workflows
  }

  // IDでワークフローを取得
  getWorkflowById(id) {
    return this.workflows.find(w => w.id === id)
  }

  // ワークフローを作成
  createWorkflow(workflowData) {
    const newWorkflow = {
      id: Date.now(),
      name: workflowData.name || '新規ワークフロー',
      description: workflowData.description || '',
      steps: workflowData.steps || [],
      status: 'draft',
      createdAt: new Date().toISOString(),
      lastRun: null
    }

    this.workflows.push(newWorkflow)
    this.saveWorkflows()
    return newWorkflow
  }

  // ワークフローを更新
  updateWorkflow(id, updates) {
    const index = this.workflows.findIndex(w => w.id === id)
    if (index === -1) {
      throw new Error('ワークフローが見つかりません')
    }

    this.workflows[index] = {
      ...this.workflows[index],
      ...updates,
      updatedAt: new Date().toISOString()
    }

    this.saveWorkflows()
    return this.workflows[index]
  }

  // ワークフローを削除
  deleteWorkflow(id) {
    const index = this.workflows.findIndex(w => w.id === id)
    if (index === -1) {
      throw new Error('ワークフローが見つかりません')
    }

    this.workflows.splice(index, 1)
    this.saveWorkflows()
  }

  // ワークフローを複製
  duplicateWorkflow(id) {
    const original = this.getWorkflowById(id)
    if (!original) {
      throw new Error('ワークフローが見つかりません')
    }

    const duplicate = {
      ...original,
      id: Date.now(),
      name: original.name + ' (コピー)',
      status: 'draft',
      createdAt: new Date().toISOString(),
      lastRun: null
    }

    this.workflows.push(duplicate)
    this.saveWorkflows()
    return duplicate
  }

  // ワークフローを実行
  async executeWorkflow(id, input, onProgress) {
    const workflow = this.getWorkflowById(id)
    if (!workflow) {
      throw new Error('ワークフローが見つかりません')
    }

    if (workflow.status !== 'active') {
      throw new Error('このワークフローは実行できません（ステータス: ' + workflow.status + '）')
    }

    const results = []
    let currentInput = input

    try {
      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i]
        
        // 進捗を報告
        if (onProgress) {
          onProgress({
            step: i + 1,
            total: workflow.steps.length,
            stepName: step.name,
            status: 'running'
          })
        }

        // プロンプトを処理（変数置換）
        let processedPrompt = step.prompt
        processedPrompt = processedPrompt.replace(/\{\{input\}\}/g, currentInput)
        
        // 前のステップの結果を参照
        for (let j = 0; j < results.length; j++) {
          const stepKey = `step${j + 1}_output`
          processedPrompt = processedPrompt.replace(new RegExp(`\\{\\{${stepKey}\\}\\}`, 'g'), results[j].output)
        }

        // LLMに送信
        const output = await llmService.sendMessage(processedPrompt)

        const stepResult = {
          stepId: step.id,
          stepName: step.name,
          input: processedPrompt,
          output: output,
          timestamp: new Date().toISOString()
        }

        results.push(stepResult)
        
        // 次のステップの入力として使用
        currentInput = output

        // 進捗を報告
        if (onProgress) {
          onProgress({
            step: i + 1,
            total: workflow.steps.length,
            stepName: step.name,
            status: 'completed',
            result: stepResult
          })
        }
      }

      // 実行履歴を更新
      this.updateWorkflow(id, {
        lastRun: new Date().toISOString()
      })

      return {
        workflowId: id,
        workflowName: workflow.name,
        input: input,
        results: results,
        finalOutput: results[results.length - 1]?.output || '',
        executedAt: new Date().toISOString()
      }

    } catch (error) {
      // エラーが発生した場合も進捗を報告
      if (onProgress) {
        onProgress({
          step: results.length + 1,
          total: workflow.steps.length,
          status: 'error',
          error: error.message
        })
      }
      throw error
    }
  }

  // ワークフロー実行履歴を取得
  getExecutionHistory() {
    const saved = localStorage.getItem('llm-agent-workflow-history')
    return saved ? JSON.parse(saved) : []
  }

  // ワークフロー実行履歴を保存
  saveExecutionHistory(execution) {
    const history = this.getExecutionHistory()
    history.unshift(execution) // 最新を先頭に
    
    // 最新100件のみ保持
    const trimmedHistory = history.slice(0, 100)
    localStorage.setItem('llm-agent-workflow-history', JSON.stringify(trimmedHistory))
  }

  // ワークフローテンプレートを取得
  getTemplates() {
    return [
      {
        name: 'テキスト要約',
        description: '長いテキストを簡潔に要約します',
        steps: [
          {
            id: 1,
            type: 'prompt',
            name: 'テキスト要約',
            prompt: '以下のテキストを3つのポイントで要約してください：\n\n{{input}}'
          }
        ]
      },
      {
        name: '翻訳・校正',
        description: 'テキストを翻訳し、品質をチェックします',
        steps: [
          {
            id: 1,
            type: 'prompt',
            name: '翻訳',
            prompt: '以下のテキストを英語に翻訳してください：\n\n{{input}}'
          },
          {
            id: 2,
            type: 'prompt',
            name: '校正',
            prompt: '以下の翻訳を校正し、より自然な表現に改善してください：\n\n{{step1_output}}'
          }
        ]
      },
      {
        name: 'コード解説',
        description: 'コードを解析し、わかりやすく解説します',
        steps: [
          {
            id: 1,
            type: 'prompt',
            name: 'コード解析',
            prompt: '以下のコードを解析し、何をしているかを説明してください：\n\n{{input}}'
          },
          {
            id: 2,
            type: 'prompt',
            name: '改善提案',
            prompt: '以下のコードについて、改善点や最適化の提案をしてください：\n\n{{input}}'
          }
        ]
      }
    ]
  }
}

// シングルトンインスタンス
const workflowService = new WorkflowService()

export default workflowService

