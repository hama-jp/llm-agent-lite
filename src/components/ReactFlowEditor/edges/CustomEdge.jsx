import React from 'react';
import { getBezierPath, EdgeLabelRenderer, BaseEdge } from '@xyflow/react';
import useExecutionStore from '../../../store/executionStore';

export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  sourceHandleId,
  source,
  target,
}) {
  const executionState = useExecutionStore(state => state.executionState);
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const getLabel = () => {
    switch (sourceHandleId) {
      case 'true':
        return 'True';
      case 'false':
        return 'False';
      case 'loop':
        return 'Loop';
      default:
        return null;
    }
  };

  const label = getLabel();
  
  // 実行状態に応じたスタイルの決定
  const isRunning = executionState?.running;
  const isSourceExecuted = executionState?.executedNodeIds?.has?.(source);
  const isTargetExecuting = executionState?.currentNodeId === target;
  const isSourceExecuting = executionState?.currentNodeId === source;
  
  // アニメーションが必要な条件: 実行中で、ソースが実行済みまたは実行中
  const shouldAnimate = isRunning && (isSourceExecuted || isSourceExecuting);
  
  // デバッグログ
  if (shouldAnimate) {
    console.log(`Edge ${source}->${target} should animate:`, { 
      isRunning, isSourceExecuted, isSourceExecuting, isTargetExecuting 
    });
  }
  
  // エッジのスタイル
  const edgeStyle = {
    ...style,
    stroke: shouldAnimate ? '#3b82f6' : '#b1b1b7',
    strokeWidth: shouldAnimate ? 3 : 2,
    ...(shouldAnimate && {
      strokeDasharray: '10 5',
      animation: 'flowAnimation 2s linear infinite',
    }),
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={edgeStyle} id={id} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 12,
              padding: '2px 5px',
              background: '#eee',
              borderRadius: 5,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
