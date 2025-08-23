# Testing and Debugging Guide for React Flow Migration

This document provides instructions for testing and debugging the new node editor, which has been migrated to React Flow. As I was unable to run tests in my development environment due to dependency installation issues, this guide is intended to help you validate the changes in your local environment.

## 1. Dependency Installation

The new editor requires the `@xyflow/react` library.

**Action:** Run the following command in your terminal:
```bash
pnpm install @xyflow/react
```

**Note:** Since this installation could not be completed in my environment, the `pnpm-lock.yaml` file is not updated. You may need to resolve potential conflicts or simply delete the lock file and run `pnpm install` from scratch to ensure a clean installation.

## 2. Overview of Architectural Changes

The migration introduced several significant changes:

*   **Component Replacement:**
    *   The old `<NodeEditor />`, `<NodeCanvas />`, and the `useNodeInteraction.js` hook have been **deleted**.
    *   They have been replaced by a new, more modern `<ReactFlowEditor />` component located at `src/components/ReactFlowEditor/index.jsx`.
    *   The new editor is rendered within a `<ReactFlowProvider>` in `src/components/WorkflowView.jsx`.

*   **State Management:**
    *   A new Zustand store, `useReactFlowStore` (`src/store/reactFlowStore.js`), now manages the state of nodes, edges, and the viewport.
    *   A second new store, `useExecutionStore` (`src/store/executionStore.js`), manages the state of the workflow execution process.

*   **New Workflow Data Format:**
    *   The data structure for saved workflows has been redesigned to be React Flow-native. Backward compatibility has been **removed** as requested.
    *   The new format is:
        ```json
        {
          "id": "workflow_id",
          "name": "My Workflow",
          "flow": {
            "nodes": [ /* ...React Flow nodes... */ ],
            "edges": [ /* ...React Flow edges... */ ],
            "viewport": { "x": 0, "y": 0, "zoom": 1 }
          }
        }
        ```
    *   Node size is now stored in `node.data.width` and `node.data.height`.
    *   Sample workflows in `public/samples/` have been updated to this new format.

## 3. Manual Testing Steps

Please perform the following checks to verify the core functionality.

1.  **Initial Load:**
    *   **Action:** Launch the application.
    *   **Expected Result:** The editor should load, and the default sample workflow ("01 - Simple Input/Output") should be displayed on the canvas.

2.  **Adding Nodes:**
    *   **Action:** Right-click anywhere on the canvas grid.
    *   **Expected Result:** A context menu should appear under your cursor. Clicking on a node type (e.g., "Input/Output" -> "Input") should add a new node to the canvas where you clicked.

3.  **Connecting Nodes:**
    *   **Action:** Add an "Input" and an "Output" node. Drag a connection from the handle on the right side of the Input node to the handle on the left side of the Output node.
    *   **Expected Result:** A new edge should appear, connecting the two nodes.

4.  **Running a Workflow:**
    *   **Action:** With the simple Input -> Output workflow connected, click the "Run Workflow" button in the top-right corner.
    *   **Expected Result:** The execution should complete, and the text from the Input node ("Hello, World!") should appear in the content area of the Output node.

5.  **Saving and Restoring State:**
    *   **Action:** Move nodes around, pan the canvas (middle-mouse drag or space + drag), and zoom (scroll wheel). Then, reload the application page.
    *   **Expected Result:** The editor should reload with the nodes in their last position and the viewport at the same pan/zoom level you left it. This confirms that auto-saving is working.

## 4. Automated Testing Suggestions (Vitest)

While I couldn't run tests, here are suggestions for new test files:

*   **`src/store/reactFlowStore.test.js`**:
    *   Test the `loadWorkflow` action: does it correctly parse the new workflow format and update the `nodes`, `edges`, and `viewport` state?
    *   Test the `onConnect` action: does it create a new edge with `type: 'custom'`?

*   **`src/components/ReactFlowEditor/nodes/CustomNode.test.jsx`**:
    *   Write a simple rendering test to ensure the `CustomNode` wrapper renders correctly given a set of `data` props.

*   **`src/components/ReactFlowEditor/index.test.jsx`**:
    *   This would be an integration test. You can use `@testing-library/react` to render the component and fire events to simulate user actions (e.g., right-clicking the pane) and then assert that the Zustand store was updated correctly.

## 5. Known Issues and Next Steps

*   **Workflow Toolbar Integration:** The toolbar for creating, renaming, and deleting workflows (previously part of `<NodeEditor />`) is **not** fully integrated into the new editor. The buttons will be visible, but their `onClick` handlers need to be re-wired to interact with the new state management system. This is the most critical next step to restore full application functionality.
*   **Node-Specific UI:** Only the `InputNode` has a fully migrated UI component. The other node types (`LLM`, `If`, `Output`, etc.) need their respective components created in `src/components/ReactFlowEditor/nodes/` and registered in the `nodeTypes` map in `ReactFlowEditor/index.jsx`. The pattern established with `InputNodeComponent.jsx` should be followed.

Thank you for the opportunity to work on this migration. I believe this new architecture provides a strong and scalable foundation for future development.
