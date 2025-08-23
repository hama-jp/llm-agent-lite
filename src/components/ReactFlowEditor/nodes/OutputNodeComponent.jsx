import React from 'react';
import CustomNode from './CustomNode';
import { Textarea } from '@/components/ui/textarea';
import useExecutionStore from '../../../store/executionStore';
import nodeExecutionService from '../../../services/nodeExecutionService';

const OutputNodeComponent = ({ id, data }) => {
  const executionResult = useExecutionStore(state => state.executionResult);
  
  // 実行コンテキストから結果を取得
  const contextResult = nodeExecutionService.executionContext[id];
  const displayResult = contextResult || data.result || 'No result yet...';
  
  return (
    <CustomNode data={data}>
      <Textarea
        value={displayResult}
        readOnly
        className="nodrag bg-gray-50 text-gray-700"
        placeholder="Execution result will appear here..."
        rows={4}
      />
    </CustomNode>
  );
};

export default OutputNodeComponent;