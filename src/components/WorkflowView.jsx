import { useState, useEffect } from 'react'
import { Plus, Play, Edit, Trash2, Copy, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import workflowService from '../services/workflowService.js'

const WorkflowView = () => {
  const [workflows, setWorkflows] = useState([])
  const [selectedWorkflow, setSelectedWorkflow] = useState(null)
  const [executionInput, setExecutionInput] = useState('')
  const [executionProgress, setExecutionProgress] = useState(null)
  const [executionResult, setExecutionResult] = useState(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    loadWorkflows()
  }, [])

  const loadWorkflows = () => {
    setWorkflows(workflowService.getAllWorkflows())
  }

  const handleRunWorkflow = async (workflow) => {
    if (!executionInput.trim()) {
      alert('実行する入力テキストを入力してください')
      return
    }

    setIsExecuting(true)
    setExecutionProgress(null)
    setExecutionResult(null)
    setSelectedWorkflow(workflow)

    try {
      const result = await workflowService.executeWorkflow(
        workflow.id,
        executionInput,
        (progress) => {
          setExecutionProgress(progress)
        }
      )

      setExecutionResult(result)
      workflowService.saveExecutionHistory(result)
      loadWorkflows() // 最終実行日時を更新するため再読み込み
      
    } catch (error) {
      console.error('Workflow execution error:', error)
      setExecutionResult({
        error: error.message,
        workflowName: workflow.name
      })
    } finally {
      setIsExecuting(false)
      setExecutionProgress(null)
    }
  }

  const handleEditWorkflow = (workflow) => {
    // TODO: ワークフロー編集モーダルを実装
    alert('ワークフロー編集機能は今後実装予定です')
  }

  const handleDeleteWorkflow = (workflowId) => {
    if (confirm('このワークフローを削除しますか？')) {
      workflowService.deleteWorkflow(workflowId)
      loadWorkflows()
    }
  }

  const handleDuplicateWorkflow = (workflow) => {
    workflowService.duplicateWorkflow(workflow.id)
    loadWorkflows()
  }

  const handleCreateWorkflow = () => {
    // TODO: ワークフロー作成モーダルを実装
    alert('ワークフロー作成機能は今後実装予定です')
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'draft':
        return 'bg-yellow-100 text-yellow-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return 'アクティブ'
      case 'draft':
        return '下書き'
      case 'error':
        return 'エラー'
      default:
        return '不明'
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '未実行'
    return new Date(dateString).toLocaleString('ja-JP')
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">ワークフロー</h2>
          <p className="text-gray-600">LLMを使った自動化ワークフローを作成・管理します</p>
        </div>
        <Button onClick={handleCreateWorkflow}>
          <Plus className="h-4 w-4 mr-2" />
          新規ワークフロー
        </Button>
      </div>

      {/* 実行セクション */}
      <Card>
        <CardHeader>
          <CardTitle>ワークフロー実行</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="executionInput">入力テキスト</Label>
            <Input
              id="executionInput"
              value={executionInput}
              onChange={(e) => setExecutionInput(e.target.value)}
              placeholder="ワークフローで処理したいテキストを入力してください..."
              disabled={isExecuting}
            />
          </div>

          {/* 実行進捗 */}
          {executionProgress && (
            <Alert className="border-blue-200 bg-blue-50">
              <Clock className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                ステップ {executionProgress.step}/{executionProgress.total}: {executionProgress.stepName}
                {executionProgress.status === 'running' && ' - 実行中...'}
                {executionProgress.status === 'completed' && ' - 完了'}
                {executionProgress.status === 'error' && ` - エラー: ${executionProgress.error}`}
              </AlertDescription>
            </Alert>
          )}

          {/* 実行結果 */}
          {executionResult && (
            <Alert className={executionResult.error ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
              {executionResult.error ? (
                <AlertCircle className="h-4 w-4 text-red-600" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
              <AlertDescription className={executionResult.error ? 'text-red-800' : 'text-green-800'}>
                {executionResult.error ? (
                  <div>
                    <strong>エラーが発生しました:</strong>
                    <br />
                    {executionResult.error}
                  </div>
                ) : (
                  <div>
                    <strong>実行完了:</strong> {executionResult.workflowName}
                    <br />
                    <div className="mt-2 p-2 bg-white rounded border">
                      <strong>結果:</strong>
                      <pre className="whitespace-pre-wrap text-sm mt-1">{executionResult.finalOutput}</pre>
                    </div>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* ワークフロー一覧 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {workflows.map((workflow) => (
          <Card key={workflow.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{workflow.name}</CardTitle>
                <Badge className={getStatusColor(workflow.status)}>
                  {getStatusText(workflow.status)}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">{workflow.description}</p>
            </CardHeader>
            <CardContent>
              {/* ステップ表示 */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">ステップ ({workflow.steps.length}個):</h4>
                <div className="flex flex-wrap gap-1">
                  {workflow.steps.map((step, index) => (
                    <Badge key={step.id} variant="outline" className="text-xs">
                      {index + 1}. {step.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 最終実行日時 */}
              <p className="text-xs text-gray-500 mb-4">
                最終実行: {formatDate(workflow.lastRun)}
              </p>

              {/* アクションボタン */}
              <div className="flex space-x-1">
                <Button
                  size="sm"
                  onClick={() => handleRunWorkflow(workflow)}
                  disabled={workflow.status !== 'active' || isExecuting || !executionInput.trim()}
                  className="flex-1"
                >
                  <Play className="h-3 w-3 mr-1" />
                  実行
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEditWorkflow(workflow)}
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDuplicateWorkflow(workflow)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeleteWorkflow(workflow.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {workflows.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-gray-500 mb-4">まだワークフローがありません</p>
            <Button onClick={handleCreateWorkflow}>
              <Plus className="h-4 w-4 mr-2" />
              最初のワークフローを作成
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default WorkflowView

