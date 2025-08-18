import { useState, useEffect } from 'react'
import { Download, Upload, Trash2, FileText, MessageSquare, Workflow } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import workflowService from '../services/workflowService.js'

const DataView = () => {
  const [chatHistory, setChatHistory] = useState([])
  const [workflowData, setWorkflowData] = useState([])
  const [workflowHistory, setWorkflowHistory] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    // チャット履歴を読み込み
    const savedChatHistory = localStorage.getItem('llm-agent-chat-history')
    if (savedChatHistory) {
      try {
        const history = JSON.parse(savedChatHistory)
        // チャット履歴をセッション単位でグループ化
        const sessions = groupChatMessages(history)
        setChatHistory(sessions)
      } catch (error) {
        console.error('Failed to load chat history:', error)
        setChatHistory([])
      }
    }

    // ワークフローデータを読み込み
    const workflows = workflowService.getAllWorkflows()
    setWorkflowData(workflows)

    // ワークフロー実行履歴を読み込み
    const execHistory = workflowService.getExecutionHistory()
    setWorkflowHistory(execHistory)
  }

  const groupChatMessages = (messages) => {
    const sessions = []
    let currentSession = null
    
    messages.forEach((message, index) => {
      if (message.type === 'user') {
        // 新しいセッションの開始
        if (currentSession) {
          sessions.push(currentSession)
        }
        currentSession = {
          id: `session_${index}`,
          title: message.content.substring(0, 30) + (message.content.length > 30 ? '...' : ''),
          messageCount: 1,
          createdAt: message.timestamp || new Date().toLocaleTimeString(),
          lastActivity: message.timestamp || new Date().toLocaleTimeString(),
          messages: [message]
        }
      } else if (currentSession) {
        // 既存セッションにメッセージを追加
        currentSession.messageCount++
        currentSession.lastActivity = message.timestamp || new Date().toLocaleTimeString()
        currentSession.messages.push(message)
      }
    })
    
    if (currentSession) {
      sessions.push(currentSession)
    }
    
    return sessions.reverse() // 最新を先頭に
  }

  const handleExportData = (type) => {
    let data = {}
    let filename = ''

    switch (type) {
      case 'chat':
        data = { 
          chatHistory: JSON.parse(localStorage.getItem('llm-agent-chat-history') || '[]'),
          exportedAt: new Date().toISOString() 
        }
        filename = 'chat_history.json'
        break
      case 'workflows':
        data = { 
          workflows: workflowData,
          workflowHistory: workflowHistory,
          exportedAt: new Date().toISOString() 
        }
        filename = 'workflow_data.json'
        break
      case 'all':
        data = {
          chatHistory: JSON.parse(localStorage.getItem('llm-agent-chat-history') || '[]'),
          workflows: workflowData,
          workflowHistory: workflowHistory,
          settings: JSON.parse(localStorage.getItem('llm-agent-settings') || '{}'),
          exportedAt: new Date().toISOString()
        }
        filename = 'llm_agent_backup.json'
        break
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImportData = (event) => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        
        if (data.chatHistory) {
          localStorage.setItem('llm-agent-chat-history', JSON.stringify(data.chatHistory))
        }
        if (data.workflows) {
          localStorage.setItem('llm-agent-workflows', JSON.stringify(data.workflows))
        }
        if (data.workflowHistory) {
          localStorage.setItem('llm-agent-workflow-history', JSON.stringify(data.workflowHistory))
        }
        if (data.settings) {
          localStorage.setItem('llm-agent-settings', JSON.stringify(data.settings))
        }
        
        loadData() // データを再読み込み
        alert('データのインポートが完了しました')
      } catch (error) {
        alert('ファイルの読み込みに失敗しました: ' + error.message)
      }
    }
    reader.readAsText(file)
    
    // ファイル選択をリセット
    event.target.value = ''
  }

  const handleDeleteChatHistory = (sessionId) => {
    if (confirm('このチャット履歴を削除しますか？')) {
      // 実際の実装では、特定のセッションのみを削除する必要があります
      // 簡単のため、ここでは全履歴を再読み込みします
      loadData()
    }
  }

  const handleClearAllData = () => {
    if (confirm('すべてのデータを削除しますか？この操作は取り消せません。')) {
      localStorage.removeItem('llm-agent-chat-history')
      localStorage.removeItem('llm-agent-workflows')
      localStorage.removeItem('llm-agent-workflow-history')
      localStorage.removeItem('llm-agent-settings')
      loadData()
      alert('すべてのデータが削除されました')
    }
  }

  const calculateStorageSize = () => {
    let totalSize = 0
    const keys = ['llm-agent-chat-history', 'llm-agent-workflows', 'llm-agent-workflow-history', 'llm-agent-settings']
    
    keys.forEach(key => {
      const item = localStorage.getItem(key)
      if (item) {
        totalSize += new Blob([item]).size
      }
    })
    
    return (totalSize / 1024).toFixed(1) + ' KB'
  }

  const formatDate = (dateString) => {
    if (!dateString) return '不明'
    try {
      return new Date(dateString).toLocaleString('ja-JP')
    } catch {
      return dateString
    }
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">データ管理</h2>
          <p className="text-gray-600">チャット履歴やワークフローデータの管理・エクスポート</p>
        </div>
        <div className="flex space-x-2">
          <input
            type="file"
            accept=".json"
            onChange={handleImportData}
            className="hidden"
            id="import-file"
          />
          <Button
            variant="outline"
            onClick={() => document.getElementById('import-file').click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            インポート
          </Button>
          <Button onClick={() => handleExportData('all')}>
            <Download className="h-4 w-4 mr-2" />
            全データエクスポート
          </Button>
        </div>
      </div>

      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chat">チャット履歴</TabsTrigger>
          <TabsTrigger value="workflows">ワークフロー</TabsTrigger>
          <TabsTrigger value="settings">設定・その他</TabsTrigger>
        </TabsList>

        {/* チャット履歴タブ */}
        <TabsContent value="chat" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">チャット履歴 ({chatHistory.length}セッション)</h3>
            <Button
              variant="outline"
              onClick={() => handleExportData('chat')}
              disabled={chatHistory.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              チャット履歴エクスポート
            </Button>
          </div>

          <div className="grid gap-4">
            {chatHistory.map((session) => (
              <Card key={session.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <MessageSquare className="h-4 w-4 text-gray-500" />
                        <h4 className="font-medium">{session.title}</h4>
                        <Badge variant="outline">{session.messageCount}メッセージ</Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>作成日時: {session.createdAt}</p>
                        <p>最終活動: {session.lastActivity}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteChatHistory(session.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {chatHistory.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-500">チャット履歴がありません</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ワークフロータブ */}
        <TabsContent value="workflows" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">ワークフロー ({workflowData.length}個) / 実行履歴 ({workflowHistory.length}件)</h3>
            <Button
              variant="outline"
              onClick={() => handleExportData('workflows')}
              disabled={workflowData.length === 0 && workflowHistory.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              ワークフローデータエクスポート
            </Button>
          </div>

          <div className="grid gap-4">
            {/* ワークフロー定義 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">ワークフロー定義</CardTitle>
              </CardHeader>
              <CardContent>
                {workflowData.map((workflow) => (
                  <div key={workflow.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div className="flex items-center space-x-2">
                      <Workflow className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{workflow.name}</span>
                      <Badge variant="outline">{workflow.steps.length}ステップ</Badge>
                      <Badge className={workflow.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                        {workflow.status === 'active' ? 'アクティブ' : '下書き'}
                      </Badge>
                    </div>
                    <span className="text-sm text-gray-500">
                      最終実行: {formatDate(workflow.lastRun)}
                    </span>
                  </div>
                ))}
                {workflowData.length === 0 && (
                  <p className="text-gray-500 text-center py-4">ワークフローがありません</p>
                )}
              </CardContent>
            </Card>

            {/* 実行履歴 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">実行履歴 (最新10件)</CardTitle>
              </CardHeader>
              <CardContent>
                {workflowHistory.slice(0, 10).map((execution, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{execution.workflowName}</span>
                      <Badge variant="outline">成功</Badge>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatDate(execution.executedAt)}
                    </span>
                  </div>
                ))}
                {workflowHistory.length === 0 && (
                  <p className="text-gray-500 text-center py-4">実行履歴がありません</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 設定・その他タブ */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>データ管理</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium">ローカルストレージ使用量</h4>
                  <p className="text-sm text-gray-600">設定やデータの保存に使用</p>
                </div>
                <Badge variant="outline">{calculateStorageSize()}</Badge>
              </div>

              <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-red-800">全データ削除</h4>
                  <p className="text-sm text-red-600">すべての設定、チャット履歴、ワークフローデータを削除</p>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleClearAllData}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  全削除
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default DataView

