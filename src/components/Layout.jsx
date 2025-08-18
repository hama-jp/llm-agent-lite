import { useState } from 'react'
import { Menu, Settings, MessageSquare, Workflow, Database, X } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'

const Layout = ({ children, currentView, onViewChange }) => {
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

