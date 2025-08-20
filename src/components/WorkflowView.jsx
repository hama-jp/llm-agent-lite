import NodeEditor from './NodeEditor.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'

const WorkflowView = (props) => {
  return (
    <ErrorBoundary>
      <NodeEditor {...props} />
    </ErrorBoundary>
  )
}

export default WorkflowView

