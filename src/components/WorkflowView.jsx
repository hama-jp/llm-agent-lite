import { useState } from 'react'
import NodeEditor from './NodeEditor.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'

const WorkflowView = ({ onWorkflowActions }) => {
  const [nodeEditorRef, setNodeEditorRef] = useState(null)

  // ワークフロー管理機能をNodeEditorから取得
  const workflowActions = nodeEditorRef ? {
    save: nodeEditorRef.saveWorkflow,
    load: nodeEditorRef.loadWorkflow,
    export: nodeEditorRef.exportWorkflow,
    import: nodeEditorRef.importWorkflow,
    execute: nodeEditorRef.executeWorkflow,
    isExecuting: nodeEditorRef.isExecuting
  } : null

  // 親コンポーネントにワークフロー管理機能を渡す
  if (onWorkflowActions && workflowActions) {
    onWorkflowActions(workflowActions)
  }

  return (
    <ErrorBoundary>
      <NodeEditor ref={setNodeEditorRef} />
    </ErrorBoundary>
  )
}

export default WorkflowView

