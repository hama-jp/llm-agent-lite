import React from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import ReactFlowEditor from './ReactFlowEditor/index.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';

const WorkflowView = ({ selectedNode, onSelectedNodeChange, editingNode, onEditingNodeChange }) => {
  return (
    <ErrorBoundary>
      <ReactFlowProvider>
        <ReactFlowEditor 
          selectedNode={selectedNode}
          onSelectedNodeChange={onSelectedNodeChange}
          editingNode={editingNode}
          onEditingNodeChange={onEditingNodeChange}
        />
      </ReactFlowProvider>
    </ErrorBoundary>
  );
};

export default WorkflowView

