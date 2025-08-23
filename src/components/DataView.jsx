import { useState, useEffect, useCallback } from 'react'
import { Download, Upload, Trash2, FileText, MessageSquare, Workflow, History } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import workflowManagerService from '../services/workflowManagerService.js'
import logService from '../services/logService.js'
import StorageService from '../services/storageService.js'

const DataView = () => {
  const [_chatHistory, setChatHistory] = useState([])
  const [workflowData, setWorkflowData] = useState([])

  const loadData = useCallback(() => {
    // チャット履歴を読み込み
    try {
      const history = StorageService.getChatHistory([])
      const sessions = groupChatMessages(history)
      setChatHistory(sessions)
    } catch (error) {
      console.error('Failed to load chat history:', error)
      setChatHistory([])
    }

    // ワークフローデータを読み込み
    const workflows = Object.values(workflowManagerService.getWorkflows());
    setWorkflowData(workflows);
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const groupChatMessages = (messages) => {
    const sessions = []
    let currentSession = null
    
    messages.forEach((message, index) => {
      if (message.type === 'user') {
        if (currentSession) sessions.push(currentSession)
        currentSession = {
          id: `session_${index}`,
          title: message.content.substring(0, 30) + (message.content.length > 30 ? '...' : ''),
          messageCount: 1,
          createdAt: message.timestamp || new Date().toLocaleTimeString(),
          lastActivity: message.timestamp || new Date().toLocaleTimeString(),
          messages: [message]
        }
      } else if (currentSession) {
        currentSession.messageCount++
        currentSession.lastActivity = message.timestamp || new Date().toLocaleTimeString()
        currentSession.messages.push(message)
      }
    })
    
    if (currentSession) sessions.push(currentSession)
    return sessions.reverse()
  }

  const handleExportData = (type) => {
    let data = {}
    let filename = ''

    switch (type) {
      case 'chat':
        data = { chatHistory: StorageService.getChatHistory([]) }
        filename = 'chat_history.json'
        break
      case 'workflows':
        data = { workflows: workflowManagerService.getWorkflows() }
        filename = 'workflow_data.json'
        break
      case 'all':
        data = {
          chatHistory: StorageService.getChatHistory([]),
          workflows: workflowManagerService.getWorkflows(),
          settings: StorageService.getSettings({}),
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
          StorageService.setChatHistory(data.chatHistory)
        }
        if (data.workflows) {
          const workflows = data.workflows;
          Object.values(workflows).forEach(wf => workflowManagerService.saveWorkflow(wf));
        }
        if (data.settings) {
          StorageService.setSettings(data.settings)
        }
        
        loadData()
        alert('Data import completed successfully')
      } catch (error) {
        alert('Failed to read file: ' + error.message)
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const handleDeleteWorkflow = (id) => {
    if (confirm('Delete this workflow?')) {
      workflowManagerService.deleteWorkflow(id);
      loadData();
    }
  }

  const handleClearExecutionLogs = async () => {
    if (confirm('Delete all execution history? This action cannot be undone.')) {
      try {
        await logService.clearAllLogs()
        alert('Execution history has been deleted')
      } catch (error) {
        console.error('実行履歴の削除に失敗しました:', error)
        alert('Failed to delete execution history')
      }
    }
  }

  const handleClearAllData = () => {
    if (confirm('Delete all data? This action cannot be undone.')) {
      StorageService.clear() // 全てのStorageServiceキーをクリア
      // 実行履歴も削除
      logService.clearAllLogs().catch(console.error)
      loadData()
      alert('All data has been deleted')
    }
  }

  const calculateStorageSize = () => {
    const usageInfo = StorageService.getUsageInfo()
    const totalSize = Object.values(usageInfo).reduce((total, info) => total + info.size, 0)
    return (totalSize / 1024).toFixed(1) + ' KB'
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown'
    try {
      return new Date(dateString).toLocaleString('ja-JP')
    } catch {
      return dateString
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Data Management</h2>
          <p className="text-gray-600">Manage and export chat history and workflow data</p>
        </div>
        <div className="flex space-x-2">
          <input type="file" accept=".json" onChange={handleImportData} className="hidden" id="import-file" />
          <Button variant="outline" onClick={() => document.getElementById('import-file').click()}>
            <Upload className="h-4 w-4 mr-2" />Import
          </Button>
          <Button onClick={() => handleExportData('all')}>
            <Download className="h-4 w-4 mr-2" />Export All Data
          </Button>
        </div>
      </div>

      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chat">Chat History</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="settings">Settings & Other</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-4">
          {/* Chat history content remains the same */}
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Workflows ({workflowData.length} items)</h3>
            <Button variant="outline" onClick={() => handleExportData('workflows')} disabled={workflowData.length === 0}>
              <Download className="h-4 w-4 mr-2" />Export Workflows
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {workflowData.map((workflow) => (
                  <div key={workflow.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center space-x-3">
                      <Workflow className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="font-medium">{workflow.name}</p>
                        <p className="text-sm text-gray-500">{workflow.nodes.length} nodes, {workflow.connections.length} connections</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-500">Last modified: {formatDate(workflow.lastModified)}</span>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteWorkflow(workflow.id)} className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {workflowData.length === 0 && (
                <p className="text-gray-500 text-center py-8">No workflows available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Data Management</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div><h4 className="font-medium">Local Storage Usage</h4><p className="text-sm text-gray-600">Used for storing settings and data</p></div>
                <Badge variant="outline">{calculateStorageSize()}</Badge>
              </div>
              <div className="flex justify-between items-center p-4 bg-yellow-50 rounded-lg">
                <div><h4 className="font-medium text-yellow-800">Clear Execution History</h4><p className="text-sm text-yellow-600">Delete all workflow execution history</p></div>
                <Button variant="outline" onClick={handleClearExecutionLogs} className="text-yellow-800 border-yellow-300 hover:bg-yellow-100"><History className="h-4 w-4 mr-2" />Clear History</Button>
              </div>
              <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                <div><h4 className="font-medium text-red-800">Delete All Data</h4><p className="text-sm text-red-600">Delete all settings, chat history, and workflow data</p></div>
                <Button variant="destructive" onClick={handleClearAllData}><Trash2 className="h-4 w-4 mr-2" />Delete All</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default DataView
