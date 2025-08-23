import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const CustomNode = ({ data, children }) => {
  const { label, icon, inputs = [], outputs = [] } = data;
  
  // デフォルトのハンドル設定（ノードタイプに基づく）
  const getDefaultHandles = () => {
    if (data.label === 'Input' || data.inputType === 'text') {
      return { inputs: [], outputs: [{ name: 'output', id: '0' }] };
    }
    if (data.label === 'Output' || data.format === 'text') {
      return { inputs: [{ name: 'input', id: '0' }], outputs: [] };
    }
    if (data.label?.includes('LLM') || data.systemPrompt) {
      return { inputs: [{ name: 'input', id: '0' }], outputs: [{ name: 'output', id: '0' }] };
    }
    return { inputs: [], outputs: [] };
  };
  
  const { inputs: defaultInputs, outputs: defaultOutputs } = getDefaultHandles();
  const finalInputs = inputs.length > 0 ? inputs : defaultInputs;
  const finalOutputs = outputs.length > 0 ? outputs : defaultOutputs;
  
  // ハンドル数に基づく高さの計算
  const maxHandles = Math.max(finalInputs.length, finalOutputs.length);
  const minHeightClass = maxHandles >= 4 ? 'min-h-48' : 'min-h-32';

  return (
    <div className={`relative bg-white border-2 border-gray-300 rounded-lg shadow-md min-w-64 ${minHeightClass}`}>
      {/* Input handles */}
      {finalInputs.map((input, index) => (
        <React.Fragment key={input.id || `input-${index}`}>
          <Handle
            type="target"
            position={Position.Left}
            id={input.id || `input-${index}`}
            className="w-6 h-6 bg-blue-500 border-2 border-white rounded-full hover:bg-blue-600 transition-colors"
            style={{ 
              top: `calc(25% + 20px + ${index * 25}px)`,
              left: 0,
              transform: 'translate(-50%, -50%)'
            }}
          />
          <span className="absolute text-xs text-gray-600 whitespace-nowrap" style={{
            top: `calc(25% + 20px + ${index * 25}px - 8px)`,
            left: '-30px'
          }}>
            {input.name === 'input' ? 'in' : input.name === 'output' ? 'out' : input.name.replace('input', 'in')}
          </span>
        </React.Fragment>
      ))}

      {/* Output handles */}
      {finalOutputs.map((output, index) => (
        <React.Fragment key={output.id || `output-${index}`}>
          <Handle
            type="source"
            position={Position.Right}
            id={output.id || `output-${index}`}
            className="w-6 h-6 bg-green-500 border-2 border-white rounded-full hover:bg-green-600 transition-colors"
            style={{ 
              top: `calc(25% + 20px + ${index * 25}px)`,
              right: 0,
              transform: 'translate(50%, -50%)'
            }}
          />
          <span className="absolute text-xs text-gray-600 whitespace-nowrap" style={{
            top: `calc(25% + 20px + ${index * 25}px - 8px)`,
            right: '-30px'
          }}>
            {output.name === 'input' ? 'in' : output.name === 'output' ? 'out' : output.name.replace('input', 'in').replace('output', 'out')}
          </span>
        </React.Fragment>
      ))}

      {/* Header */}
      <div className={`px-4 py-2 rounded-t-lg ${data.colorClass || 'bg-gray-100'} border-b border-gray-300`}>
        <div className="text-sm font-medium flex items-center space-x-2">
          <span className="text-lg">{icon}</span>
          <span>{label}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="nodrag">
          {children}
        </div>
      </div>
    </div>
  );
};

export default memo(CustomNode);
