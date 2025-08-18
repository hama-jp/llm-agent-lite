import { useState } from 'react'
import Layout from './components/Layout.jsx'
import ChatView from './components/ChatView.jsx'
import WorkflowView from './components/WorkflowView.jsx'
import DataView from './components/DataView.jsx'
import SettingsView from './components/SettingsView.jsx'
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('chat')
  const [workflowActions, setWorkflowActions] = useState(null)

  const renderCurrentView = () => {
    switch (currentView) {
      case 'chat':
        return <ChatView />
      case 'workflow':
        return <WorkflowView onWorkflowActions={setWorkflowActions} />
      case 'data':
        return <DataView />
      case 'settings':
        return <SettingsView />
      default:
        return <ChatView />
    }
  }

  return (
    <Layout 
      currentView={currentView} 
      onViewChange={setCurrentView}
      workflowActions={workflowActions}
    >
      {renderCurrentView()}
    </Layout>
  )
}

export default App
