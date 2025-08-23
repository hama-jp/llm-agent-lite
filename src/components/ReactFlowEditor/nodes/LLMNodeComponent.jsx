import React from 'react';
import CustomNode from './CustomNode';
import { Textarea } from '@/components/ui/textarea';

const LLMNodeComponent = ({ id, data }) => {
  const onSystemPromptChange = (evt) => {
    console.log('System prompt:', evt.target.value);
  };

  return (
    <CustomNode data={data}>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">System Prompt</label>
          <Textarea
            defaultValue={data.systemPrompt || ''}
            onChange={onSystemPromptChange}
            className="nodrag text-xs"
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