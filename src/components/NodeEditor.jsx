import React, { useState, useRef, useCallback } from 'react';

const NodeEditor = () => {
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStart, setConnectionStart] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const canvasRef = useRef(null);

  const nodeTypes = {
    input: { name: '入力', icon: '📥', color: '#ff6b6b', inputs: [], outputs: ['output'] },
    llm: { name: 'LLM生成', icon: '🤖', color: '#4ecdc4', inputs: ['input'], outputs: ['output'] },
    if: { name: 'If条件分岐', icon: '🔀', color: '#45b7d1', inputs: ['input'], outputs: ['true', 'false'] },
    while: { name: 'While繰り返し', icon: '🔄', color: '#96ceb4', inputs: ['input'], outputs: ['output', 'loop'] },
    output: { name: '出力', icon: '📤', color: '#feca57', inputs: ['input'], outputs: [] }
  };

  const addNode = useCallback((type, x = 300, y = 200) => {
    const newNode = {
      id: Date.now().toString(),
      type,
      x,
      y,
      data: {}
    };
    setNodes(prev => [...prev, newNode]);
    setContextMenu(null);
  }, []);

  const handleCanvasRightClick = useCallback((e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    setContextMenu({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      canvasX: e.clientX - rect.left,
      canvasY: e.clientY - rect.top
    });
  }, []);

  const handleCanvasClick = useCallback((e) => {
    if (contextMenu) {
      setContextMenu(null);
    }
    if (isConnecting) {
      setIsConnecting(false);
      setConnectionStart(null);
    }
  }, [contextMenu, isConnecting]);

  const handlePortClick = useCallback((nodeId, portName, portType) => {
    if (!isConnecting) {
      // 接続開始
      if (portType === 'output') {
        setIsConnecting(true);
        setConnectionStart({ nodeId, portName, portType });
      }
    } else {
      // 接続完了
      if (portType === 'input' && connectionStart && connectionStart.portType === 'output') {
        const newConnection = {
          id: Date.now().toString(),
          from: connectionStart.nodeId,
          fromPort: connectionStart.portName,
          to: nodeId,
          toPort: portName
        };
        setConnections(prev => [...prev, newConnection]);
      }
      setIsConnecting(false);
      setConnectionStart(null);
    }
  }, [isConnecting, connectionStart]);

  const renderNode = (node) => {
    const nodeType = nodeTypes[node.type];
    return (
      <div
        key={node.id}
        className="node"
        style={{
          position: 'absolute',
          left: node.x,
          top: node.y,
          width: '200px',
          background: nodeType.color,
          border: selectedNode?.id === node.id ? '2px solid #333' : '1px solid #ccc',
          borderRadius: '8px',
          padding: '10px',
          cursor: 'move',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}
        onClick={() => setSelectedNode(node)}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '16px', marginRight: '8px' }}>{nodeType.icon}</span>
          <span style={{ fontWeight: 'bold', color: 'white' }}>{nodeType.name}</span>
        </div>
        
        {/* 入力ポート */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {nodeType.inputs.map(input => (
            <div key={input} style={{ display: 'flex', alignItems: 'center' }}>
              <div
                className="port input-port"
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#333',
                  cursor: 'pointer',
                  marginRight: '8px'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePortClick(node.id, input, 'input');
                }}
              />
              <span style={{ fontSize: '12px', color: 'white' }}>{input}</span>
            </div>
          ))}
        </div>

        {/* 出力ポート */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
          {nodeType.outputs.map(output => (
            <div key={output} style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'white', marginRight: '8px' }}>{output}</span>
              <div
                className="port output-port"
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#333',
                  cursor: 'pointer'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePortClick(node.id, output, 'output');
                }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderConnection = (connection) => {
    const fromNode = nodes.find(n => n.id === connection.from);
    const toNode = nodes.find(n => n.id === connection.to);
    
    if (!fromNode || !toNode) return null;

    const fromX = fromNode.x + 200;
    const fromY = fromNode.y + 30;
    const toX = toNode.x;
    const toY = toNode.y + 30;

    const path = `M ${fromX} ${fromY} C ${fromX + 50} ${fromY} ${toX - 50} ${toY} ${toX} ${toY}`;

    return (
      <path
        key={connection.id}
        d={path}
        stroke="#666"
        strokeWidth="2"
        fill="none"
        markerEnd="url(#arrowhead)"
      />
    );
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <div
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          background: '#f5f5f5',
          position: 'relative',
          cursor: isConnecting ? 'crosshair' : 'default'
        }}
        onContextMenu={handleCanvasRightClick}
        onClick={handleCanvasClick}
      >
        {/* SVG for connections */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1
          }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
            </marker>
          </defs>
          {connections.map(renderConnection)}
        </svg>

        {/* Nodes */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          {nodes.map(renderNode)}
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <div
            style={{
              position: 'absolute',
              left: contextMenu.x,
              top: contextMenu.y,
              background: 'white',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              zIndex: 1000,
              minWidth: '150px'
            }}
          >
            {Object.entries(nodeTypes).map(([type, config]) => (
              <div
                key={type}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #eee'
                }}
                onClick={() => addNode(type, contextMenu.canvasX, contextMenu.canvasY)}
                onMouseEnter={(e) => e.target.style.background = '#f0f0f0'}
                onMouseLeave={(e) => e.target.style.background = 'white'}
              >
                <span style={{ marginRight: '8px' }}>{config.icon}</span>
                {config.name}
              </div>
            ))}
          </div>
        )}

        {/* Status */}
        {isConnecting && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              background: 'rgba(0,0,0,0.8)',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '4px',
              zIndex: 1000
            }}
          >
            接続中... 入力ポートをクリックしてください
          </div>
        )}

        {nodes.length === 0 && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              color: '#666'
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
            <div style={{ fontSize: '18px', marginBottom: '8px' }}>ノードを追加してください</div>
            <div style={{ fontSize: '14px' }}>右クリックでノードを追加できます</div>
          </div>
        )}
      </div>

      {/* Properties Panel */}
      {selectedNode && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            width: '250px',
            background: 'white',
            border: '1px solid #ccc',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            zIndex: 1000
          }}
        >
          <h3 style={{ margin: '0 0 16px 0' }}>
            {nodeTypes[selectedNode.type].icon} {nodeTypes[selectedNode.type].name}
          </h3>
          <div style={{ fontSize: '14px', color: '#666' }}>
            ID: {selectedNode.id}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            位置: ({selectedNode.x}, {selectedNode.y})
          </div>
        </div>
      )}
    </div>
  );
};

export default NodeEditor;

