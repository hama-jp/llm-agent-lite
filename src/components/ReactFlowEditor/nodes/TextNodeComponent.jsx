import React from 'react';
import CustomNode from './CustomNode';
import { Textarea } from '@/components/ui/textarea';

const TextNodeComponent = ({ id, data }) => {
  const onTextChange = (evt) => {
    console.log('Text:', evt.target.value);
  };

  return (
    <CustomNode data={data}>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Text Content</label>
          <Textarea
            defaultValue={data.text || ''}
            onChange={onTextChange}
            className="nodrag text-xs"
            placeholder="Enter text content..."
            rows={4}
          />
        </div>
        <div className="text-xs text-gray-400">
          Format: {data.format || 'plain'}
        </div>
      </div>
    </CustomNode>
  );
};

export default TextNodeComponent;