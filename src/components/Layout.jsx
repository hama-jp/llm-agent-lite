import { useState } from 'react'
import { Menu, Settings, MessageSquare, Workflow, Database, X, Save, Upload, Download, Play } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'

const Layout = ({ children, currentView, onViewChange, workflowActions }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const menuItems = [
    { id: 'chat', label: 'チャット', icon: MessageSquare },
    { id: 'workflow', label: 'ワークフロー', icon: Workflow },
    { id: 'data', label: 'データ管理', icon: Database },
    { id: 'settings', label: '設定', icon: Settings },
  ]

  return (
    <div className="h-screen flex bg-gray-50">
      {/* サイドバー */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 bg-white shadow-lg flex flex-col`}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-800">LLM Agent Lite</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="md:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.id}>
                  <Button
                    variant={currentView === item.id ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => onViewChange(item.id)}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Button>
                </li>
              )
            })}
          </ul>
          
          {/* ワークフロー管理 - ワークフロー画面でのみ表示 */}
          {currentView === 'workflow' && workflowActions && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-3">ワークフロー管理</h3>
              <div className="space-y-2">
                <Button
                  onClick={workflowActions.save}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  <Save className="h-3 w-3 mr-2" />
                  保存
                </Button>
                <Button
                  onClick={workflowActions.load}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  <Upload className="h-3 w-3 mr-2" />
                  読み込み
                </Button>
                <Button
                  onClick={workflowActions.export}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  <Download className="h-3 w-3 mr-2" />
                  エクスポート
                </Button>
                <label className="block">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start cursor-pointer"
                    asChild
                  >
                    <span>
                      <Upload className="h-3 w-3 mr-2" />
                      インポート
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept=".json"
                    onChange={workflowActions.import}
                    className="hidden"
                  />
                </label>
                <Button
                  onClick={workflowActions.execute}
                  disabled={workflowActions.isExecuting}
                  variant="default"
                  size="sm"
                  className="w-full justify-start"
                >
                  <Play className="h-3 w-3 mr-2" />
                  {workflowActions.isExecuting ? '実行中...' : '実行'}
                </Button>
              </div>
            </div>
          )}
        </nav>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col">
        {/* ヘッダー */}
        <header className="bg-white shadow-sm border-b p-4">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="mr-4"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold text-gray-800">
              {menuItems.find(item => item.id === currentView)?.label || 'ダッシュボード'}
            </h2>
          </div>
        </header>

        {/* メインコンテンツエリア */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout

