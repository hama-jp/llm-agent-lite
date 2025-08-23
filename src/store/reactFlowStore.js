import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react';
import workflowManagerService from '../services/workflowManagerService';

const useReactFlowStore = create(
  devtools(
    (set, get) => ({
      nodes: [],
      edges: [],
      viewport: null,

      onNodesChange: (changes) => {
        set({
          nodes: applyNodeChanges(changes, get().nodes),
        });
      },

      onEdgesChange: (changes) => {
        set({
          edges: applyEdgeChanges(changes, get().edges),
        });
      },

      onConnect: (connection) => {
        set({
          edges: addEdge({ ...connection, type: 'custom' }, get().edges),
        });
      },

      setNodes: (nodes) => {
        set({ nodes });
      },

      setEdges: (edges) => {
        set({ edges });
      },

      addNode: (newNode) => {
        set({ nodes: [...get().nodes, newNode] });
      },

      setViewport: (viewport) => {
        set({ viewport });
      },

      loadWorkflow: (id) => {
        const workflow = workflowManagerService.getWorkflow(id);
        if (workflow && workflow.flow) {
          const { nodes, edges, viewport } = workflow.flow;
          set({
            nodes: nodes || [],
            edges: edges || [],
            viewport: viewport || null,
          });
        }
      },
    }),
    {
      name: 'react-flow-store',
    }
  )
);

export default useReactFlowStore;
