import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useExecutionStore = create(
  devtools(
    (set) => ({
      executor: null,
      executionState: { running: false, currentNodeId: null, executedNodeIds: new Set() },
      executionResult: null,
      debugLog: [],

      setExecutor: (executor) => set({ executor }),
      setExecutionState: (executionState) => set({ executionState }),
      setExecutionResult: (executionResult) => set({ executionResult }),
      setDebugLog: (debugLog) => set({ debugLog }),

      resetExecution: () => set({
        executor: null,
        executionState: { running: false, currentNodeId: null, executedNodeIds: new Set() },
        executionResult: null,
        debugLog: [],
      }),
    }),
    {
      name: 'execution-store',
    }
  )
);

export default useExecutionStore;
