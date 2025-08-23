import React, { forwardRef, useCallback } from 'react'
import { Trash2 } from 'lucide-react'

// ノードタイプ定義（親コンポーネントから受け取る）
const NodeCanvas = forwardRef(({
  nodes,
  connections,
  nodeTypes,
  selectedNode,
  selectedConnection,
  setSelectedConnection,
  connectionPaths,
  draggingLine,
  isConnecting,
  connectionStart,
  executionState,
  contextMenu,
  portRefs,
  onNodeMouseDown,
  onNodeClick,
  onNodeDelete,
  onPortMouseDown,
  onPortMouseUp,
  onNodeValueChange,
  onSystemPromptChange,
  onResizeMouseDown,
  onCanvasClick,
  onCanvasRightClick,
  onMouseMove,
  onMouseUp,
  onAddNodeFromContext,
  draggedNode
}, ref) => {

  const renderNode = useCallback((node) => {
    const nodeType = nodeTypes[node.type];
    if (!nodeType) return null;
    const isSelected = selectedNode?.id === node.id;
    const isRunning = executionState.currentNodeId === node.id;
    const isExecuted = executionState.executedNodeIds.has(node.id);
    let borderClass = 'border-gray-300';
    if (isRunning) borderClass = 'border-blue-500 ring-4 ring-blue-300';
    else if (isExecuted) borderClass = 'border-green-500';
    if (isSelected) borderClass = `${nodeType.borderColor} border-4 shadow-2xl`;

    return (
      <div 
        key={node.id} 
        className={`absolute bg-white border-2 rounded-lg shadow-lg cursor-move min-w-40 transition-all duration-200 hover:shadow-xl select-none ${borderClass}`}
        style={{ 
          left: node.position.x, 
          top: node.position.y, 
          width: node.size?.width || 160, 
          height: node.size?.height || 120,
          zIndex: isSelected ? 10 : 1, 
          transform: isSelected ? 'scale(1.02)' : 'scale(1)', 
          userSelect: 'none' 
        }}
        onMouseDown={(e) => onNodeMouseDown(e, node)} 
        onClick={(e) => onNodeClick(e, node)}
      >
        <div className={`${nodeType.color} ${nodeType.textColor} px-3 py-2 rounded-t-md flex items-center justify-between`}>
          <div className="flex items-center space-x-2">
            <span className="text-lg">{nodeType.icon}</span>
            <span className="text-sm font-medium truncate max-w-24">{node.data.label}</span>
          </div>
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              onNodeDelete(node.id) 
            }} 
            className="text-white hover:text-red-200 ml-2 opacity-70 hover:opacity-100 transition-opacity"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
        <div className="p-3 space-y-2">
          {nodeType.inputs.map((inputName, index) => (
            <div key={`input-${index}`} className="flex items-center">
              <div 
                ref={(el) => {
                  if (el && portRefs) {
                    portRefs.current.set(`${node.id}-input-${index}`, el);
                  }
                }}
                className={`port w-4 h-4 rounded-full cursor-pointer transition-all duration-200 mr-2 ${
                  isConnecting ? 'bg-green-400 hover:bg-green-500 shadow-lg' : 'bg-gray-400 hover:bg-gray-600'
                }`} 
                onMouseUp={(e) => onPortMouseUp(e, node.id, index, false)} 
                title={`Input: ${inputName}`} 
              />
              <span className="text-xs text-gray-600 font-medium">{inputName}</span>
            </div>
          ))}
          <div className="text-xs text-gray-700 bg-gray-50 p-2 rounded border">
            {node.type === 'input' && node.data.inputType !== 'text' && (
              <div className="truncate">{node.data.value || 'Set input value...'}</div>
            )}
            {node.type === 'llm' && (
              <textarea 
                className="w-full text-xs bg-transparent border-none focus:ring-0 resize-none" 
                value={node.data.systemPrompt || ''} 
                onChange={(e) => onSystemPromptChange(node.id, e.target.value)} 
                onMouseDown={(e) => e.stopPropagation()} 
                onClick={(e) => e.stopPropagation()} 
                placeholder="System prompt..." 
                style={{ height: `${Math.max(60, (node.size?.height || 240) - 140)}px` }} 
              />
            )}
            {node.type === 'if' && (
              <div className="truncate">Condition: {node.data.condition?.substring(0, 30)}...</div>
            )}
            {node.type === 'while' && (
              <div className="truncate">Loop: {node.data.variable} {node.data.operator} {node.data.value}</div>
            )}
            {node.type === 'variable_set' && (
              <div className="truncate">Variable: {node.data.variableName} = {node.data.useInput ? 'input value' : node.data.value?.substring(0, 20) + '...'}</div>
            )}
            {node.type === 'input' && node.data.inputType === 'text' && (
              <textarea 
                className="w-full text-xs bg-transparent border-none focus:ring-0 resize-none" 
                value={String(node.data.value || '')} 
                onChange={(e) => onNodeValueChange(node.id, e.target.value)} 
                onMouseDown={(e) => e.stopPropagation()} 
                onClick={(e) => e.stopPropagation()} 
                placeholder="Input value..." 
                style={{ height: `${Math.max(10, (node.size?.height || 168) - 110)}px` }} 
              />
            )}
            {node.type === 'output' && (
              <textarea 
                className="w-full text-xs bg-transparent border-none focus:ring-0 resize-none" 
                readOnly 
                value={String(node.data.result || '')} 
                placeholder="Execution result..." 
                style={{ height: `${Math.max(10, (node.size?.height || 168) - 110)}px` }} 
              />
            )}
          </div>
          {nodeType.outputs.map((outputName, index) => (
            <div key={`output-${index}`} className="flex items-center justify-end">
              <span className="text-xs text-gray-600 font-medium mr-2">{outputName}</span>
              <div 
                ref={(el) => {
                  if (el && portRefs) {
                    portRefs.current.set(`${node.id}-output-${index}`, el);
                  }
                }}
                className={`port w-4 h-4 rounded-full cursor-pointer transition-all duration-200 ${
                  isConnecting && connectionStart?.nodeId === node.id && connectionStart?.portIndex === index 
                    ? 'bg-blue-600 ring-2 ring-blue-400' 
                    : 'bg-gray-400 hover:bg-blue-500'
                }`} 
                onMouseDown={(e) => onPortMouseDown(e, node.id, index, true)} 
                title={`Output: ${outputName}`} 
              />
            </div>
          ))}
        </div>
        {/* リサイズハンドル（入力・出力ノードのみ） */}
        {(node.type === 'input' || node.type === 'output') && (
          <div 
            className="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-gray-400 hover:bg-gray-600 transition-colors"
            style={{ 
              clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
              borderRadius: '0 0 6px 0'
            }}
            onMouseDown={(e) => onResizeMouseDown(e, node)}
            title="Drag to resize"
          />
        )}
      </div>
    );
  }, [nodeTypes, selectedNode, executionState, isConnecting, connectionStart, portRefs, onNodeMouseDown, onNodeClick, onNodeDelete, onPortMouseUp, onPortMouseDown, onNodeValueChange, onSystemPromptChange, onResizeMouseDown]);

  const renderConnections = useCallback(() => {
    return connectionPaths.map((path, index) => {
      const { id, pathData, strokeColor, fromPortName, fromX, fromY } = path;
      const isSelected = selectedConnection === id;
      
      // 接続線が処理中かどうかを判定
      const connection = connections.find(conn => conn.id === id);
      const isProcessing = connection && 
        executionState.running && 
        (executionState.currentNodeId === connection.to.nodeId ||  // 現在のノードへの入力
         executionState.executedNodeIds.has(connection.from.nodeId)); // 実行済みノードからの出力
      
      return (
        <svg key={id || index} className="absolute z-10" style={{ left: 0, top: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
          <defs>
            <linearGradient id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.8} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0.48} />
            </linearGradient>
            <filter id={`glow-${index}`}>
              <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <marker id={`arrowhead-${index}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill={strokeColor} />
            </marker>
            <marker id="arrowhead-selected" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#e11d48" />
            </marker>
          </defs>
          <g className="cursor-pointer" onClick={(e) => { e.stopPropagation(); setSelectedConnection(id); }} style={{ pointerEvents: 'all' }}>
            <path d={pathData} stroke="transparent" strokeWidth="20" fill="none" />
            <path 
              d={pathData} 
              stroke={isSelected ? '#e11d48' : `url(#gradient-${index})`} 
              strokeWidth={isSelected ? 4 : 3} 
              fill="none" 
              filter={isSelected ? 'url(#glow-selected)' : `url(#glow-${index})`} 
              markerEnd={isSelected ? 'url(#arrowhead-selected)' : `url(#arrowhead-${index})`} 
              className="transition-all duration-200" 
            />
            {!isSelected && isProcessing && (
              <circle r="4" fill={strokeColor} className="opacity-80">
                <animateMotion dur="2s" repeatCount="indefinite" path={pathData} />
              </circle>
            )}
          </g>
          {fromPortName !== 'output' && (
            <text x={fromX + 5} y={fromY - 8} className="text-xs font-medium fill-gray-600" textAnchor="start" style={{ pointerEvents: 'none' }}>
              {fromPortName}
            </text>
          )}
        </svg>
      );
    });
  }, [connectionPaths, selectedConnection, setSelectedConnection, connections, executionState]);

  const renderDraggingLine = () => {
    if (!draggingLine) return null;
    const { startX, startY, endX, endY } = draggingLine;
    const pathData = `M ${startX} ${startY} C ${(startX + endX) / 2} ${startY}, ${(startX + endX) / 2} ${endY}, ${endX} ${endY}`;
    return (
      <svg className="absolute pointer-events-none z-50" style={{ left: 0, top: 0, width: '100%', height: '100%', overflow: 'visible' }}>
        <path d={pathData} stroke="#e11d48" strokeWidth="3" fill="none" filter="url(#glow-selected)" markerEnd="url(#arrowhead-selected)" />
      </svg>
    );
  };

  return (
    <div 
      ref={ref}
      className="w-full h-full relative cursor-crosshair select-none" 
      onMouseMove={onMouseMove} 
      onMouseUp={onMouseUp} 
      onContextMenu={onCanvasRightClick} 
      onClick={onCanvasClick}
      style={{ 
        backgroundImage: 'radial-gradient(circle, #ccc 1px, transparent 1px)', 
        backgroundSize: '20px 20px', 
        userSelect: draggedNode || isConnecting ? 'none' : 'auto' 
      }}
    >
      {renderConnections()}
      {renderDraggingLine()}
      {nodes.map(renderNode)}
      {contextMenu && (
        <div 
          className="fixed bg-white rounded-lg shadow-lg border py-2 z-50 min-w-48" 
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div className="px-3 py-1 text-xs text-gray-500 border-b mb-1">Add Node</div>
          {Object.entries(nodeTypes).map(([type, config]) => (
            <button 
              key={type} 
              onClick={() => onAddNodeFromContext(type)} 
              className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center space-x-2 transition-colors"
            >
              <span className="text-lg">{config.icon}</span>
              <span className="text-sm">{config.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

NodeCanvas.displayName = 'NodeCanvas';

export default NodeCanvas;