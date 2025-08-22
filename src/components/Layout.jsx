
import { Menu, Settings, MessageSquare, Workflow, Database, X } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { useStore, selectSidebarOpen, useUIActions } from '../store/index.js'

const NodePropertiesPanel = ({ editingNode, onEditingNodeChange }) => {
  if (!editingNode) return null;

  const handleDataChange = (partialData) => {
    if (!editingNode) return;
    const newEditingNodeData = { ...editingNode.data, ...partialData };
    onEditingNodeChange({ ...editingNode, data: newEditingNodeData });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (event) => {
        handleDataChange({
          fileContent: event.target.result,
          fileName: file.name,
          value: `ファイル: ${file.name}` // Display file name in the text area as a visual cue
        });
      };
      reader.readAsText(file);
    } else {
      alert('TXTファイルを選択してください。');
    }
  };

  return (
    <div className="p-3">
      <h3 className="font-semibold mb-3 text-sm text-gray-700">ノードプロパティ</h3>
      <div className="space-y-2">
        <div><label className="block text-xs font-medium mb-1 text-gray-600">ノード名</label><input type="text" value={editingNode.data.label} onChange={(e) => handleDataChange({ label: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md" /></div>
        {editingNode.type === 'input' && (
          <>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-600">入力タイプ</label>
              <select
                value={editingNode.data.inputType || 'text'}
                onChange={(e) => handleDataChange({ inputType: e.target.value, value: '', fileContent: null, fileName: null })}
                className="w-full px-2 py-1.5 text-sm border rounded-md"
              >
                <option value="text">テキスト</option>
                <option value="file">ファイル (txt)</option>
              </select>
            </div>
            {(editingNode.data.inputType === 'file') ? (
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600">入力ファイル</label>
                <input type="file" accept=".txt" onChange={handleFileChange} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100" />
                {editingNode.data.fileName && <p className="text-xs text-gray-500 mt-1">読み込み済み: {editingNode.data.fileName}</p>}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600">入力値</label>
                <textarea
                  value={editingNode.data.value || ''}
                  onChange={(e) => handleDataChange({ value: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border rounded-md"
                  rows={3}
                  placeholder="実行時の入力値を設定します"
                />
              </div>
            )}
          </>
        )}
        {editingNode.type === 'llm' && (
          <>
            <div><label className="block text-xs font-medium mb-1 text-gray-600">システムプロンプト</label><textarea value={editingNode.data.systemPrompt || ''} onChange={(e) => handleDataChange({ systemPrompt: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md" rows={5} placeholder="LLMの役割や応答に関する指示を入力..." /></div>
            <div><label className="block text-xs font-medium mb-1 text-gray-600">Temperature</label><input type="number" value={editingNode.data.temperature || 0.7} onChange={(e) => handleDataChange({ temperature: parseFloat(e.target.value) })} className="w-full px-2 py-1.5 text-sm border rounded-md" min="0" max="2" step="0.1" /></div>
            
            {/* プロバイダー選択 */}
            <div><label className="block text-xs font-medium mb-1 text-gray-600">プロバイダー</label><select value={editingNode.data.provider || 'openai'} onChange={(e) => handleDataChange({ provider: e.target.value, model: e.target.value === 'openai' ? 'gpt-5-nano' : e.target.value === 'anthropic' ? 'claude-3-5-sonnet-20241022' : e.target.value === 'local' ? 'llama2' : 'custom-model' })} className="w-full px-2 py-1.5 text-sm border rounded-md"><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option><option value="local">ローカルLLM</option><option value="custom">カスタムAPI</option></select></div>
            
            {/* モデル選択 */}
            <div><label className="block text-xs font-medium mb-1 text-gray-600">モデル</label>
            {(editingNode.data.provider === 'local' || editingNode.data.provider === 'custom') ? (
              <input type="text" value={editingNode.data.model || ''} onChange={(e) => handleDataChange({ model: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md" placeholder="モデル名を入力してください" />
            ) : (
              <select value={editingNode.data.model || (editingNode.data.provider === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 'gpt-5-nano')} onChange={(e) => handleDataChange({ model: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md">
                {editingNode.data.provider === 'anthropic' ? (
                  <>
                    <option value="claude-3-5-sonnet-20241022">claude-3-5-sonnet-20241022</option>
                    <option value="claude-3-haiku-20240307">claude-3-haiku-20240307</option>
                    <option value="claude-3-opus-20240229">claude-3-opus-20240229</option>
                  </>
                ) : (
                  <>
                    <option value="gpt-5">gpt-5</option>
                    <option value="gpt-5-mini">gpt-5-mini</option>
                    <option value="gpt-5-nano">gpt-5-nano</option>
                  </>
                )}
              </select>
            )}
            </div>
          </>
        )}
        {editingNode.type === 'if' && ( <><div><label className="block text-xs font-medium mb-1 text-gray-600">条件タイプ</label><select value={editingNode.data.conditionType || 'llm'} onChange={(e) => handleDataChange({ conditionType: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md"><option value="llm">LLM判断</option><option value="variable">変数比較</option></select></div>{editingNode.data.conditionType === 'llm' ? (<><div><label className="block text-xs font-medium mb-1 text-gray-600">判断条件</label><textarea value={editingNode.data.condition || ''} onChange={(e) => handleDataChange({ condition: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md" rows={3} placeholder="LLMに判断させる条件を入力" /></div><div><label className="block text-xs font-medium mb-1 text-gray-600">Temperature</label><input type="number" value={editingNode.data.temperature || 0.7} onChange={(e) => handleDataChange({ temperature: parseFloat(e.target.value) })} className="w-full px-2 py-1.5 text-sm border rounded-md" min="0" max="2" step="0.1" /></div>            {/* プロバイダー選択 */}
            <div><label className="block text-xs font-medium mb-1 text-gray-600">プロバイダー</label><select value={editingNode.data.provider || 'openai'} onChange={(e) => handleDataChange({ provider: e.target.value, model: e.target.value === 'openai' ? 'gpt-5-nano' : e.target.value === 'anthropic' ? 'claude-3-5-sonnet-20241022' : e.target.value === 'local' ? 'llama2' : 'custom-model' })} className="w-full px-2 py-1.5 text-sm border rounded-md"><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option><option value="local">ローカルLLM</option><option value="custom">カスタムAPI</option></select></div>
            
            {/* モデル選択 */}
            <div><label className="block text-xs font-medium mb-1 text-gray-600">モデル</label>
            {(editingNode.data.provider === 'local' || editingNode.data.provider === 'custom') ? (
              <input type="text" value={editingNode.data.model || ''} onChange={(e) => handleDataChange({ model: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md" placeholder="モデル名を入力してください" />
            ) : (
              <select value={editingNode.data.model || (editingNode.data.provider === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 'gpt-5-nano')} onChange={(e) => handleDataChange({ model: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md">
                {editingNode.data.provider === 'anthropic' ? (
                  <>
                    <option value="claude-3-5-sonnet-20241022">claude-3-5-sonnet-20241022</option>
                    <option value="claude-3-haiku-20240307">claude-3-haiku-20240307</option>
                    <option value="claude-3-opus-20240229">claude-3-opus-20240229</option>
                  </>
                ) : (
                  <>
                    <option value="gpt-5">gpt-5</option>
                    <option value="gpt-5-mini">gpt-5-mini</option>
                    <option value="gpt-5-nano">gpt-5-nano</option>
                  </>
                )}
              </select>
            )}
            </div></>) : (<><div><label className="block text-xs font-medium mb-1 text-gray-600">変数名</label><input type="text" value={editingNode.data.variable || ''} onChange={(e) => handleDataChange({ variable: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md" placeholder="比較する変数名" /></div><div><label className="block text-xs font-medium mb-1 text-gray-600">演算子</label><select value={editingNode.data.operator || '=='} onChange={(e) => handleDataChange({ operator: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md"><option value="==">==(等しい)</option><option value="!=">!=(等しくない)</option><option value="<">&lt;(より小さい)</option><option value="<=">&lt;=(以下)</option><option value=">">&gt;(より大きい)</option><option value=">=">&gt;=(以上)</option></select></div><div><label className="block text-xs font-medium mb-1 text-gray-600">比較値</label><input type="text" value={editingNode.data.value || ''} onChange={(e) => handleDataChange({ value: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md" placeholder="比較する値" /></div></>)}</> )}
        {editingNode.type === 'while' && ( <><div><label className="block text-xs font-medium mb-1 text-gray-600">条件タイプ</label><select value={editingNode.data.conditionType || 'variable'} onChange={(e) => handleDataChange({ conditionType: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md"><option value="variable">変数比較</option><option value="llm">LLM判断</option></select></div>{editingNode.data.conditionType === 'variable' ? (<><div><label className="block text-xs font-medium mb-1 text-gray-600">変数名</label><input type="text" value={editingNode.data.variable || ''} onChange={(e) => handleDataChange({ variable: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md" placeholder="比較する変数名" /></div><div><label className="block text-xs font-medium mb-1 text-gray-600">演算子</label><select value={editingNode.data.operator || '<'} onChange={(e) => handleDataChange({ operator: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md"><option value="==">==(等しい)</option><option value="!=">!=(等しくない)</option><option value="<">&lt;(より小さい)</option><option value="<=">&lt;=(以下)</option><option value=">">&gt;(より大きい)</option><option value=">=">&gt;=(以上)</option></select></div><div><label className="block text-xs font-medium mb-1 text-gray-600">比較値</label><input type="text" value={editingNode.data.value || ''} onChange={(e) => handleDataChange({ value: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md" placeholder="比較する値" /></div></>) : (<div><label className="block text-xs font-medium mb-1 text-gray-600">継続条件</label><textarea value={editingNode.data.condition || ''} onChange={(e) => handleDataChange({ condition: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md" rows={3} placeholder="繰り返しを継続する条件を入力" /></div>)}<div><label className="block text-xs font-medium mb-1 text-gray-600">最大繰り返し回数</label><input type="number" value={editingNode.data.maxIterations || 100} onChange={(e) => handleDataChange({ maxIterations: parseInt(e.target.value) })} className="w-full px-2 py-1.5 text-sm border rounded-md" min="1" max="1000" /></div></> )}
        {editingNode.type === 'output' && ( <><div><label className="block text-xs font-medium mb-1 text-gray-600">出力形式</label><select value={editingNode.data.format || 'text'} onChange={(e) => handleDataChange({ format: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md"><option value="text">テキスト</option><option value="json">JSON</option><option value="markdown">Markdown</option></select></div><div><label className="block text-xs font-medium mb-1 text-gray-600">実行結果</label><textarea value={String(editingNode.data.result || '')} readOnly className="w-full px-3 py-2 border rounded-md bg-gray-100" rows={5} /></div></> )}
        {editingNode.type === 'variable_set' && (
          <>
            <div><label className="block text-xs font-medium mb-1 text-gray-600">変数名</label><input type="text" value={editingNode.data.variableName || ''} onChange={(e) => handleDataChange({ variableName: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md" placeholder="設定する変数名" /></div>
            <div><label className="block text-xs font-medium mb-1 text-gray-600">値の設定方法</label><select value={editingNode.data.useInput ? 'input' : 'manual'} onChange={(e) => handleDataChange({ useInput: e.target.value === 'input' })} className="w-full px-2 py-1.5 text-sm border rounded-md"><option value="manual">直接入力</option><option value="input">接続からの入力</option></select></div>
            {!editingNode.data.useInput && (
              <div><label className="block text-xs font-medium mb-1 text-gray-600">設定値</label><textarea value={editingNode.data.value || ''} onChange={(e) => handleDataChange({ value: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md" rows={3} placeholder="変数に設定する値" /></div>
            )}
          </>
        )}
        {editingNode.type === 'variable_get' && (
          <>
            <div><label className="block text-xs font-medium mb-1 text-gray-600">変数名</label><input type="text" value={editingNode.data.variableName || ''} onChange={(e) => handleDataChange({ variableName: e.target.value })} className="w-full px-2 py-1.5 text-sm border rounded-md" placeholder="取得する変数名" /></div>
          </>
        )}
      </div>
    </div>
  )
}


const Layout = ({ children, currentView, onViewChange, editingNode, onEditingNodeChange }) => {
  const sidebarOpen = useStore(selectSidebarOpen)
  const { setSidebarOpen } = useUIActions()

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
        
        <nav className="flex-shrink-0 p-3">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.id}>
                <Button variant={currentView === item.id ? 'default' : 'ghost'} size="sm" className="w-full justify-start h-8" onClick={() => onViewChange(item.id)}>
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              </li>
            ))}
          </ul>
        </nav>

        {currentView === 'workflow' && (
          <div className="flex-1 overflow-y-auto border-t">
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
