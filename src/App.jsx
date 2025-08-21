import Layout from './components/Layout.jsx'
import ChatView from './components/ChatView.jsx'
import WorkflowView from './components/WorkflowView.jsx'
import DataView from './components/DataView.jsx'
import SettingsView from './components/SettingsView.jsx'
import { useStore, selectCurrentView, selectSelectedNode, selectEditingNode, useUIActions } from './store/index.js'
import './App.css'

function App() {
  // Zustandストアから状態とアクションを取得
  const currentView = useStore(selectCurrentView)
  const selectedNode = useStore(selectSelectedNode)
  const editingNode = useStore(selectEditingNode)
  const { setCurrentView, setSelectedNode, setEditingNode } = useUIActions()

  const renderCurrentView = () => {
    switch (currentView) {
      case 'chat':
        return <ChatView />
      case 'workflow':
        return <WorkflowView
                  selectedNode={selectedNode}
                  onSelectedNodeChange={setSelectedNode}
                  editingNode={editingNode}
                  onEditingNodeChange={setEditingNode}
                />
      case 'data':
        return <DataView />
      case 'settings':
        return <SettingsView />
      default:
        return <WorkflowView
                  selectedNode={selectedNode}
                  onSelectedNodeChange={setSelectedNode}
                  editingNode={editingNode}
                  onEditingNodeChange={setEditingNode}
                />
    }
  }

  return (
    <Layout 
      currentView={currentView} 
      onViewChange={setCurrentView}
      editingNode={editingNode}
      onEditingNodeChange={setEditingNode}
    >
      {renderCurrentView()}
    </Layout>
  )
}

export default App
