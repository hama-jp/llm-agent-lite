import { useState, useCallback } from 'react'
import Layout from './components/Layout.jsx'
import ChatView from './components/ChatView.jsx'
import WorkflowView from './components/WorkflowView.jsx'
import DataView from './components/DataView.jsx'
import SettingsView from './components/SettingsView.jsx'
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('workflow') // Default to workflow for now

  // State lifted from NodeEditor
  const [selectedNode, setSelectedNode] = useState(null)
  const [editingNode, setEditingNode] = useState(null)

  const handleSelectedNodeChange = useCallback((node) => {
    setSelectedNode(node);
  }, []);

  const handleEditingNodeChange = useCallback((node) => {
    setEditingNode(node);
  }, []);

  const renderCurrentView = () => {
    switch (currentView) {
      case 'chat':
        return <ChatView />
      case 'workflow':
        return <WorkflowView
                  selectedNode={selectedNode}
                  onSelectedNodeChange={handleSelectedNodeChange}
                  editingNode={editingNode}
                  onEditingNodeChange={handleEditingNodeChange}
                />
      case 'data':
        return <DataView />
      case 'settings':
        return <SettingsView />
      default:
        return <WorkflowView
                  selectedNode={selectedNode}
                  onSelectedNodeChange={handleSelectedNodeChange}
                  editingNode={editingNode}
                  onEditingNodeChange={handleEditingNodeChange}
                />
    }
  }

  return (
    <Layout 
      currentView={currentView} 
      onViewChange={setCurrentView}
      editingNode={editingNode}
      onEditingNodeChange={handleEditingNodeChange}
    >
      {renderCurrentView()}
    </Layout>
  )
}

export default App
