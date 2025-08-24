import React from 'react';
import CustomNode from './CustomNode';
import { Textarea } from '@/components/ui/textarea';
import useReactFlowStore from '../../../store/reactFlowStore';

const LLMNodeComponent = ({ id, data }) => {
  const updateNodeData = useReactFlowStore(state => state.updateNodeData);

  const onSystemPromptChange = (evt) => {
    const newValue = evt.target.value;
    updateNodeData(id, { systemPrompt: newValue });
  };

  return (
    <CustomNode data={data} id={id}>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">System Prompt</label>
          <Textarea
            value={data.systemPrompt || ''}
            onChange={onSystemPromptChange}
            className="nodrag text-xs resize-both"
            style={{ resize: 'both', overflow: 'auto', minWidth: '200px', minHeight: '80px' }}
            placeholder="Enter system prompt..."
            rows={3}
          />
        </div>
        <div className="text-xs text-gray-400">
          Model: {data.model || 'gpt-3.5-turbo'}
        </div>
      </div>
    </CustomNode>
  );
};

export default LLMNodeComponent;