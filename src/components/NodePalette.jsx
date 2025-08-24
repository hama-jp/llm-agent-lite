import React from 'react';
import { nodesByCategory } from './nodes/index.js';

const NodePalette = () => {
  const onDragStart = (event, nodeType) => {
    // ドラッグデータにノードタイプを設定
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const renderNodeItem = (nodeType, nodeDefinition) => {
    return (
      <div
        key={nodeType}
        className="flex items-center p-2 m-1 bg-white border rounded-lg cursor-grab hover:bg-gray-50 hover:shadow-md transition-all duration-200 select-none"
        draggable
        onDragStart={(event) => onDragStart(event, nodeType)}
        onDragEnd={(event) => {
          // ドラッグ終了時の処理
          event.preventDefault();
        }}
      >
        <div className="flex items-center gap-2">
          <span 
            className="text-lg flex items-center justify-center w-8 h-8 rounded"
            style={{ backgroundColor: `${nodeDefinition.color}20` }}
          >
            {nodeDefinition.emoji}
          </span>
          <div>
            <div className="text-sm font-medium text-gray-800">
              {nodeDefinition.displayName}
            </div>
            <div className="text-xs text-gray-500 line-clamp-1">
              {nodeDefinition.description || 'Node description'}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b">
        <h3 className="font-semibold text-sm text-gray-700 mb-2">Node Palette</h3>
        <p className="text-xs text-gray-500">Drag nodes to canvas</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        {Object.entries(nodesByCategory).map(([categoryId, category]) => (
          <div key={categoryId} className="mb-4">
            <h4 className="text-xs font-medium text-gray-600 mb-2 px-1">
              {category.name}
            </h4>
            <div className="space-y-1">
              {Object.entries(category.nodes).map(([nodeType, nodeDefinition]) =>
                renderNodeItem(nodeType, nodeDefinition)
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NodePalette;