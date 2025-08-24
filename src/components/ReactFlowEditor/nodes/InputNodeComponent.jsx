import React from 'react';
import CustomNode from './CustomNode';
import { Textarea } from '@/components/ui/textarea';
import useReactFlowStore from '../../../store/reactFlowStore';

const InputNodeComponent = ({ id, data }) => {
  const updateNodeData = useReactFlowStore(state => state.updateNodeData);

  const onChange = (evt) => {
    const newValue = evt.target.value;
    updateNodeData(id, { value: newValue });
  };

  return (
    <CustomNode data={data} id={id}>
      <Textarea
        value={data.value || ''}
        onChange={onChange}
        className="nodrag resize-both w-full"
        style={{ resize: 'both', overflow: 'auto', minWidth: '200px', minHeight: '100px', width: '100%' }}
        placeholder="Enter input value..."
      />
    </CustomNode>
  );
};

export default InputNodeComponent;
