import { useState, useEffect } from 'react'
import { Menu, Settings, MessageSquare, Workflow, Database, X } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'

const NodePropertiesPanel = ({ editingNode, onEditingNodeChange }) => {
  if (!editingNode) return null;

  const handleDataChange = (partialData) => {
    if (!editingNode) return;
    const newEditingNodeData = { ...editingNode.data, ...partialData };
    onEditingNodeChange(prev => ({ ...prev, data: newEditingNodeData }));
  };

  return (
    <div className="p-4 border-t">
      <h3 className="font-semibold mb-4 text-sm">ノードプロパティ</h3>
      <div className="space-y-4">
        <div><label className="block text-sm font-medium mb-1">ノード名</label><input type="text" value={editingNode.data.label} onChange={(e) => handleDataChange({ label: e.target.value })} className="w-full px-3 py-2 border rounded-md" /></div>
        {editingNode.type === 'input' && ( <><div><label className="block text-sm font-medium mb-1">入力値</label><textarea value={editingNode.data.value || ''} onChange={(e) => handleDataChange({ value: e.target.value })} className="w-full px-3 py-2 border rounded-md" rows={3} placeholder="実行時の入力値を設定します" /></div></> )}
        {editingNode.type === 'llm' && (
          <>
            <div><label className="block text-sm font-medium mb-1">プロンプト</label><textarea value={editingNode.data.prompt || ''} onChange={(e) => handleDataChange({ prompt: e.target.value })} className="w-full px-3 py-2 border rounded-md" rows={5} placeholder="プロンプトを入力してください" /></div>
            <div><label className="block text-sm font-medium mb-1">Temperature</label><input type="number" value={editingNode.data.temperature || 0.7} onChange={(e) => handleDataChange({ temperature: parseFloat(e.target.value) })} className="w-full px-3 py-2 border rounded-md" min="0" max="2" step="0.1" /></div>
            <div><label className="block text-sm font-medium mb-1">Model</label><select value={editingNode.data.model || 'gpt-5-nano'} onChange={(e) => handleDataChange({ model: e.target.value })} className="w-full px-3 py-2 border rounded-md"><option value="gpt-5">gpt-5</option><option value="gpt-5-mini">gpt-5-mini</option><option value="gpt-5-nano">gpt-5-nano</option></select></div>
          </>
        )}
        {editingNode.type === 'if' && ( <><div><label className="block text-sm font-medium mb-1">条件タイプ</label><select value={editingNode.data.conditionType || 'llm'} onChange={(e) => handleDataChange({ conditionType: e.target.value })} className="w-full px-3 py-2 border rounded-md"><option value="llm">LLM判断</option><option value="variable">変数比較</option></select></div>{editingNode.data.conditionType === 'llm' ? (<><div><label className="block text-sm font-medium mb-1">判断条件</label><textarea value={editingNode.data.condition || ''} onChange={(e) => handleDataChange({ condition: e.target.value })} className="w-full px-3 py-2 border rounded-md" rows={3} placeholder="LLMに判断させる条件を入力" /></div><div><label className="block text-sm font-medium mb-1">Temperature</label><input type="number" value={editingNode.data.temperature || 0.7} onChange={(e) => handleDataChange({ temperature: parseFloat(e.target.value) })} className="w-full px-3 py-2 border rounded-md" min="0" max="2" step="0.1" /></div><div><label className="block text-sm font-medium mb-1">Model</label><select value={editingNode.data.model || 'gpt-5-nano'} onChange={(e) => handleDataChange({ model: e.target.value })} className="w-full px-3 py-2 border rounded-md"><option value="gpt-5">gpt-5</option><option value="gpt-5-mini">gpt-5-mini</option><option value="gpt-5-nano">gpt-5-nano</option></select></div></>) : (<><div><label className="block text-sm font-medium mb-1">変数名</label><input type="text" value={editingNode.data.variable || ''} onChange={(e) => handleDataChange({ variable: e.target.value })} className="w-full px-3 py-2 border rounded-md" placeholder="比較する変数名" /></div><div><label className="block text-sm font-medium mb-1">演算子</label><select value={editingNode.data.operator || '=='} onChange={(e) => handleDataChange({ operator: e.target.value })} className="w-full px-3 py-2 border rounded-md"><option value="==">==(等しい)</option><option value="!=">!=(等しくない)</option><option value="<">&lt;(より小さい)</option><option value="<=">&lt;=(以下)</option><option value=">">&gt;(より大きい)</option><option value=">=">&gt;=(以上)</option></select></div><div><label className="block text-sm font-medium mb-1">比較値</label><input type="text" value={editingNode.data.value || ''} onChange={(e) => handleDataChange({ value: e.target.value })} className="w-full px-3 py-2 border rounded-md" placeholder="比較する値" /></div></>)}</> )}
        {editingNode.type === 'while' && ( <><div><label className="block text-sm font-medium mb-1">条件タイプ</label><select value={editingNode.data.conditionType || 'variable'} onChange={(e) => handleDataChange({ conditionType: e.target.value })} className="w-full px-3 py-2 border rounded-md"><option value="variable">変数比較</option><option value="llm">LLM判断</option></select></div>{editingNode.data.conditionType === 'variable' ? (<><div><label className="block text-sm font-medium mb-1">変数名</label><input type="text" value={editingNode.data.variable || ''} onChange={(e) => handleDataChange({ variable: e.target.value })} className="w-full px-3 py-2 border rounded-md" placeholder="比較する変数名" /></div><div><label className="block text-sm font-medium mb-1">演算子</label><select value={editingNode.data.operator || '<'} onChange={(e) => handleDataChange({ operator: e.target.value })} className="w-full px-3 py-2 border rounded-md"><option value="==">==(等しい)</option><option value="!=">!=(等しくない)</option><option value="<">&lt;(より小さい)</option><option value="<=">&lt;=(以下)</option><option value=">">&gt;(より大きい)</option><option value=">=">&gt;=(以上)</option></select></div><div><label className="block text-sm font-medium mb-1">比較値</label><input type="text" value={editingNode.data.value || ''} onChange={(e) => handleDataChange({ value: e.target.value })} className="w-full px-3 py-2 border rounded-md" placeholder="比較する値" /></div></>) : (<div><label className="block text-sm font-medium mb-1">継続条件</label><textarea value={editingNode.data.condition || ''} onChange={(e) => handleDataChange({ condition: e.target.value })} className="w-full px-3 py-2 border rounded-md" rows={3} placeholder="繰り返しを継続する条件を入力" /></div>)}<div><label className="block text-sm font-medium mb-1">最大繰り返し回数</label><input type="number" value={editingNode.data.maxIterations || 100} onChange={(e) => handleDataChange({ maxIterations: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-md" min="1" max="1000" /></div></> )}
        {editingNode.type === 'output' && ( <><div><label className="block text-sm font-medium mb-1">出力形式</label><select value={editingNode.data.format || 'text'} onChange={(e) => handleDataChange({ format: e.target.value })} className="w-full px-3 py-2 border rounded-md"><option value="text">テキスト</option><option value="json">JSON</option><option value="markdown">Markdown</option></select></div><div><label className="block text-sm font-medium mb-1">実行結果</label><textarea value={String(editingNode.data.result || '')} readOnly className="w-full px-3 py-2 border rounded-md bg-gray-100" rows={5} /></div></> )}
      </div>
    </div>
  )
}


const Layout = ({ children, currentView, onViewChange, editingNode, onEditingNodeChange }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const menuItems = [
    { id: 'workflow', label: 'ワークフロー', icon: Workflow },
    { id: 'chat', label: 'チャット', icon: MessageSquare },
    { id: 'data', label: 'データ管理', icon: Database },
    { id: 'settings', label: '設定', icon: Settings },
  ]

  return (
    <div className="h-screen flex bg-gray-50">
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 bg-white shadow-lg flex flex-col`}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-800">LLM Agent Lite</h1>
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)} className="md:hidden"><X className="h-4 w-4" /></Button>
          </div>
        </div>
        
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.id}>
                <Button variant={currentView === item.id ? 'default' : 'ghost'} className="w-full justify-start" onClick={() => onViewChange(item.id)}>
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              </li>
            ))}
          </ul>
        </nav>

        {currentView === 'workflow' && (
          <div className="flex-shrink-0 overflow-y-auto">
            <NodePropertiesPanel editingNode={editingNode} onEditingNodeChange={onEditingNodeChange} />
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm border-b p-4">
          <div className="flex items-center">
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)} className="mr-4"><Menu className="h-4 w-4" /></Button>
            <h2 className="text-lg font-semibold text-gray-800">{menuItems.find(item => item.id === currentView)?.label || 'ダッシュボード'}</h2>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout
