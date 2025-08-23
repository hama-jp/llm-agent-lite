import React from 'react';
import { useStore as useUIStore } from '../../store';
import useReactFlowStore from '../../store/reactFlowStore';
import { nodesByCategory } from '../nodes/index.js';

const ContextMenu = () => {
  const contextMenu = useUIStore(state => state.contextMenu);
  const setContextMenu = useUIStore(state => state.setContextMenu);
  const addNode = useReactFlowStore(state => state.addNode);

  if (!contextMenu) {
    return null;
  }

  const handleAddNode = (nodeType) => {
    const nodeDefinition = Object.values(nodesByCategory)
      .flatMap(category => Object.entries(category.nodes))
      .find(([key]) => key === nodeType)?.[1];

    if (!nodeDefinition) return;

    const newNode = {
      id: `${nodeType}_${Date.now()}`,
      type: nodeType, // This needs to match the key in nodeTypes map
      position: { x: contextMenu.flowX || contextMenu.x, y: contextMenu.flowY || contextMenu.y },
      data: {
        label: nodeDefinition.name,
        icon: nodeDefinition.icon,
        ...nodeDefinition.defaultData,
      },
    };
    addNode(newNode);
    setContextMenu(null);
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: contextMenu.screenX || contextMenu.x,
        top: contextMenu.screenY || contextMenu.y,
        zIndex: 1000,
      }}
      className="bg-white rounded-lg shadow-lg border py-2 min-w-48"
      onClick={() => setContextMenu(null)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="px-3 py-1 text-xs text-gray-500 border-b mb-1">Add Node</div>
      {Object.entries(nodesByCategory).map(([category, { name, nodes }]) => (
        <div key={category}>
          <div className="px-3 pt-2 text-xs font-semibold text-gray-400">{name}</div>
          {Object.entries(nodes).map(([type, config]) => (
            <button
              key={type}
              onClick={() => handleAddNode(type)}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center space-x-2 transition-colors"
            >
              <span className="text-lg">{config.icon}</span>
              <span className="text-sm">{config.name}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
};

export default ContextMenu;
