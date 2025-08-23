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
      viewport: { x: 0, y: 0, zoom: 1 },

      onNodesChange: (changes) => {
        const currentNodes = get().nodes;
        const nodes = Array.isArray(currentNodes) ? currentNodes : [];
        set({
          nodes: applyNodeChanges(changes, nodes),
        });
      },

      onEdgesChange: (changes) => {
        const currentEdges = get().edges;
        const edges = Array.isArray(currentEdges) ? currentEdges : [];
        set({
          edges: applyEdgeChanges(changes, edges),
        });
      },

      onConnect: (connection) => {
        const currentEdges = get().edges;
        const edges = Array.isArray(currentEdges) ? currentEdges : [];
        set({
          edges: addEdge({ 
            ...connection, 
            type: 'custom',
            markerEnd: { type: 'arrow' }
          }, edges),
        });
      },

      setNodes: (nodes) => {
        set({ nodes });
      },

      setEdges: (edges) => {
        set({ edges });
      },

      addNode: (newNode) => {
        const currentNodes = get().nodes;
        const nodes = Array.isArray(currentNodes) ? currentNodes : [];
        set({ nodes: [...nodes, newNode] });
      },

      setViewport: (viewport) => {
        set({ viewport });
      },

      loadWorkflow: (id) => {
        const workflow = workflowManagerService.getWorkflow(id);
        if (workflow && workflow.flow) {
          const { nodes, edges, viewport } = workflow.flow;
          set({
            nodes: Array.isArray(nodes) ? nodes : [],
            edges: Array.isArray(edges) ? edges : [],
            viewport: viewport || { x: 0, y: 0, zoom: 1 },
          });
        } else {
          // ワークフローが見つからない場合は空の状態にリセット
          set({
            nodes: [],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 },
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
