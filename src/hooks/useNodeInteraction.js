import { useCallback } from 'react'

const useNodeInteraction = ({
  nodes,
  connections,
  setNodes,
  setConnections,
  setDraggedNode,
  setDragOffset,
  setIsConnecting,
  setConnectionStart,
  setDraggingLine,
  setNodeResizing,
  setSelectedConnection,
  onSelectedNodeChange,
  canvasRef,
  draggedNode,
  dragOffset,
  isConnecting,
  draggingLine,
  nodeResizing,
  connectionStart
}) => {

  const updateNodePosition = useCallback((nodeId, position) => {
    setNodes(prev => prev.map(node => node.id === nodeId ? { ...node, position } : node));
  }, [setNodes]);

  const updateNodeSize = useCallback((nodeId, size) => {
    setNodes(prev => prev.map(node => node.id === nodeId ? { ...node, size } : node));
  }, [setNodes]);

  const handleNodeMouseDown = useCallback((e, node) => {
    if (e.target.classList.contains('port')) return;
    if (e.target.classList.contains('resize-handle')) return;
    e.preventDefault(); // ドラッグ開始時のテキスト選択を防ぐ
    setDraggedNode(node);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({ x: e.clientX - rect.left - node.position.x, y: e.clientY - rect.top - node.position.y });
    }
  }, [canvasRef, setDraggedNode, setDragOffset]);

  const handleResizeMouseDown = useCallback((e, node) => {
    e.stopPropagation();
    e.preventDefault();
    setNodeResizing({
      nodeId: node.id,
      startSize: node.size || { width: 160, height: 120 },
      startMouse: { x: e.clientX, y: e.clientY }
    });
  }, [setNodeResizing]);

  const handleNodeClick = useCallback((e, node) => {
    e.stopPropagation();
    onSelectedNodeChange(node);
    setSelectedConnection(null);
  }, [onSelectedNodeChange, setSelectedConnection]);

  const handlePortMouseDown = useCallback((e, nodeId, portIndex, isOutput) => {
    console.log('handlePortMouseDown called:', { nodeId, portIndex, isOutput });
    e.stopPropagation();
    if (!isOutput) return;
    const fromNode = nodes.find(n => n.id === nodeId);
    if (!fromNode) return;
    const rect = e.target.getBoundingClientRect();
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const startX = rect.left + rect.width / 2 - canvasRect.left;
    const startY = rect.top + rect.height / 2 - canvasRect.top;
    console.log('Starting connection from:', { nodeId, portIndex, startX, startY });
    setIsConnecting(true);
    setConnectionStart({ nodeId, portIndex });
    setDraggingLine({ startX, startY, endX: startX, endY: startY });
  }, [nodes, canvasRef, setIsConnecting, setConnectionStart, setDraggingLine]);

  const handleMouseMove = useCallback((e) => {
    // ドラッグ中のテキスト選択を防ぐ
    if (draggedNode || isConnecting || nodeResizing) {
      e.preventDefault();
      e.stopPropagation();
      document.getSelection()?.removeAllRanges(); // テキスト選択をクリア
    }

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - canvasRect.left;
    const mouseY = e.clientY - canvasRect.top;
    
    if (draggedNode) {
      const newPosition = { x: mouseX - dragOffset.x, y: mouseY - dragOffset.y };
      updateNodePosition(draggedNode.id, newPosition);
    }
    
    if (isConnecting && draggingLine) {
      setDraggingLine(prev => ({ ...prev, endX: mouseX, endY: mouseY }));
    }
    
    if (nodeResizing) {
      const deltaX = e.clientX - nodeResizing.startMouse.x;
      const deltaY = e.clientY - nodeResizing.startMouse.y;
      const newSize = {
        width: Math.max(160, nodeResizing.startSize.width + deltaX),
        height: Math.max(120, nodeResizing.startSize.height + deltaY)
      };
      updateNodeSize(nodeResizing.nodeId, newSize);
    }
  }, [canvasRef, draggedNode, dragOffset, isConnecting, draggingLine, nodeResizing, updateNodePosition, updateNodeSize, setDraggingLine]);

  const handleMouseUp = useCallback(() => {
    if (draggedNode) {
      setDraggedNode(null);
      // ドラッグ終了時にテキスト選択をクリア
      document.getSelection()?.removeAllRanges();
    }
    if (isConnecting) {
      setIsConnecting(false);
      setConnectionStart(null);
      setDraggingLine(null);
      // 接続終了時にもテキスト選択をクリア
      document.getSelection()?.removeAllRanges();
    }
    if (nodeResizing) {
      setNodeResizing(null);
      // リサイズ終了時にもテキスト選択をクリア
      document.getSelection()?.removeAllRanges();
    }
  }, [draggedNode, isConnecting, nodeResizing, setDraggedNode, setIsConnecting, setConnectionStart, setDraggingLine, setNodeResizing]);

  const handlePortMouseUp = useCallback((e, nodeId, portIndex, isOutput) => {
    console.log('handlePortMouseUp called:', {
      targetNode: nodeId,
      targetPort: portIndex,
      isOutput,
      isConnecting,
      connectionStart: connectionStart ? { nodeId: connectionStart.nodeId, portIndex: connectionStart.portIndex } : null
    });
    console.log('Current connections count:', connections.length);
    connections.forEach((conn, index) => {
      console.log(`Connection ${index}:`, {
        from: { nodeId: conn.from.nodeId, portIndex: conn.from.portIndex },
        to: { nodeId: conn.to.nodeId, portIndex: conn.to.portIndex }
      });
    });
    
    if (isOutput || !isConnecting || !connectionStart) {
      console.log('Early return:', { isOutput, isConnecting, connectionStart });
      return;
    }
    if (connectionStart.nodeId === nodeId) {
      console.log('Cannot connect to same node');
      return;
    }
    
    const existingConnection = connections.find(conn => conn.to.nodeId === nodeId && conn.to.portIndex === portIndex);
    if (existingConnection) {
      console.log("Input port is already connected:", {
        existing: {
          from: { nodeId: existingConnection.from.nodeId, portIndex: existingConnection.from.portIndex },
          to: { nodeId: existingConnection.to.nodeId, portIndex: existingConnection.to.portIndex }
        },
        trying: {
          from: { nodeId: connectionStart.nodeId, portIndex: connectionStart.portIndex },
          to: { nodeId, portIndex }
        }
      });
      return;
    }
    
    const newConnection = { id: `conn_${Date.now()}`, from: connectionStart, to: { nodeId, portIndex } };
    console.log('Creating new connection:', {
      from: { nodeId: newConnection.from.nodeId, portIndex: newConnection.from.portIndex },
      to: { nodeId: newConnection.to.nodeId, portIndex: newConnection.to.portIndex }
    });
    setConnections(prev => [...prev, newConnection]);
    setIsConnecting(false);
    setConnectionStart(null);
    setDraggingLine(null);
  }, [connections, isConnecting, connectionStart, setConnections, setIsConnecting, setConnectionStart, setDraggingLine]);

  return {
    handleNodeMouseDown,
    handleResizeMouseDown,
    handleNodeClick,
    handlePortMouseDown,
    handleMouseMove,
    handleMouseUp,
    handlePortMouseUp,
    updateNodePosition,
    updateNodeSize
  };
};

export default useNodeInteraction;