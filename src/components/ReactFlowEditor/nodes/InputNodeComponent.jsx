import React from 'react';
import CustomNode from './CustomNode';
import { Textarea } from '@/components/ui/textarea';

const InputNodeComponent = ({ id, data }) => {
  // In a later step, we'll add the onChange handler to update the store
  const onChange = (evt) => {
    console.log(evt.target.value);
  };

  return (
    <CustomNode data={data}>
      <Textarea
        defaultValue={data.value}
        onChange={onChange}
        className="nodrag"
        placeholder="Enter input value..."
      />
    </CustomNode>
  );
};

export default InputNodeComponent;
