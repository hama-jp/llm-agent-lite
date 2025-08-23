import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const CustomNode = ({ data, children }) => {
  const { label, icon, inputs = [], outputs = [] } = data;

  return (
    <Card className="w-64 shadow-lg border-2">
      <CardHeader className={`px-4 py-2 rounded-t-md flex flex-row items-center justify-between space-y-0 ${data.colorClass || 'bg-gray-200'}`}>
        <CardTitle className="text-sm font-medium flex items-center space-x-2">
          <span>{icon}</span>
          <span>{label}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {inputs.map((input, index) => (
          <Handle
            key={`input-${index}`}
            type="target"
            position={Position.Left}
            id={`${input.id || index}`}
            style={{ top: `${(index + 1) * 30 + 40}px` }}
          />
        ))}

        <div className="nodrag">
          {children}
        </div>

        {outputs.map((output, index) => (
          <Handle
            key={`output-${index}`}
            type="source"
            position={Position.Right}
            id={`${output.id || index}`}
            style={{ top: `${(index + 1) * 30 + 40}px` }}
          />
        ))}
      </CardContent>
    </Card>
  );
};

export default memo(CustomNode);
