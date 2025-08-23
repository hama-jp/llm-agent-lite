import React from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import ReactFlowEditor from './ReactFlowEditor/index.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';

const WorkflowView = () => {
  return (
    <ErrorBoundary>
      <ReactFlowProvider>
        <ReactFlowEditor />
      </ReactFlowProvider>
    </ErrorBoundary>
  );
};

export default WorkflowView

