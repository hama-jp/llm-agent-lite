# Node Definition System

This directory contains definitions for all node types available in the React Flow-based workflow system.

## 📁 Structure

```
src/components/nodes/
├── types.js              # Base type definitions and helper functions
├── index.js              # Main export file for all node definitions
├── README.md             # This file (React Flow compatible)
├── InputNode.js          # Input node definition
├── OutputNode.js         # Output node definition
├── LLMNode.js            # LLM generation node definition
├── TextCombinerNode.js   # Text combiner node definition
├── IfNode.js             # If conditional branching node definition
├── WhileNode.js          # While loop node definition
└── VariableSetNode.js    # Variable setter node definition
```

## 🎨 Available Color Themes

- `orange` - Orange theme (typically used for input nodes)
- `blue` - Blue theme (typically used for AI/processing nodes)
- `green` - Green theme (typically used for output nodes)
- `teal` - Teal theme (typically used for text processing nodes)
- `pink` - Pink theme (typically used for conditional branching nodes)
- `purple` - Purple theme (typically used for loop nodes)
- `amber` - Amber theme (typically used for variable manipulation nodes)
- `cyan` - Cyan theme (typically used for getter nodes)

## 📋 Existing Categories

- `input-output` - Input/Output operations
- `ai` - AI & Generation
- `text-processing` - Text Processing
- `control-flow` - Control Flow
- `variables` - Variables

## ➕ How to Add New Nodes

### 1. Create Node File

```bash
# Copy the template
cp NodeTemplate.js.template MyNewNode.js
```

### 2. Edit Node Definition

```javascript
import { createNodeDefinition } from './types.js';

// Define the execution function
async function executeMyNewNode(node, inputs, context) {
  // Node processing logic
  const { input1, input2 } = inputs;
  const { setting1, setting2 } = node.data;
  
  // Your custom logic here
  const result = `${input1} + ${input2} with ${setting1}`;
  
  return result;
}

export const MyNewNode = createNodeDefinition(
  'My New Node',      // name
  '⭐',                // icon
  'blue',             // colorTheme
  ['input1', 'input2'], // inputs
  ['output'],         // outputs
  {                   // defaultData
    setting1: 'default_value',
    setting2: true
  },
  executeMyNewNode,   // execute function (REQUIRED)
  {                   // options
    description: 'This is my new awesome node',
    category: 'custom'
  }
);

export default MyNewNode;
```

### 3. Register in index.js

```javascript
// Add to index.js
import MyNewNode from './MyNewNode.js';

export const nodeTypes = {
  // existing node definitions...
  my_new_node: MyNewNode
};
```

### 4. Register in Category (Optional)

```javascript
// Add to nodesByCategory in index.js
export const nodesByCategory = {
  // existing categories...
  'custom': {
    name: 'Custom',
    nodes: {
      my_new_node: MyNewNode
    }
  }
};
```

## 🔧 Helper Functions

### `createNodeDefinition(name, icon, colorTheme, inputs, outputs, defaultData, execute, options)`

Helper function to create node definitions for the React Flow system.

**Parameters:**
- `name` (string): Display name of the node
- `icon` (string): Icon (emoji recommended)
- `colorTheme` (string): Color theme name
- `inputs` (Array): Array of input port names (mapped to React Flow targetHandle)
- `outputs` (Array): Array of output port names (mapped to React Flow sourceHandle)
- `defaultData` (Object): Default data object
- `execute` (Function): **REQUIRED** - Async function that executes the node logic
- `options` (Object): Optional settings (description, category)

**Execute Function Signature:**
```javascript
async function execute(node, inputs, context) {
  // node: Node object with id, type, data properties
  // inputs: Object with input values mapped by port names
  // context: { variables, addLog }
  // Return: The output value(s) for this node
}
```

## 💡 Best Practices

1. **File Naming**: Use `[NodeType]Node.js` format
2. **Execute Functions**: Always implement the execute function as async
3. **React Flow Integration**: Input/output arrays correspond to port handles (0, 1, 2...)
4. **Error Handling**: Use try-catch in execute functions for robust error handling
5. **Categories**: Choose appropriate categories based on functionality
6. **Color Themes**: Select intuitive colors based on functionality
7. **Icons**: Use appropriate emojis that represent the functionality
8. **Descriptions**: Write clear descriptions that other developers can understand
9. **Context Usage**: Use `context.addLog()` for debugging and `context.variables` for global state

## 🔄 Modifying Existing Nodes

When modifying existing node definitions, pay attention to:

1. **Backward Compatibility**: Ensure existing workflows continue to work
2. **Default Values**: Set appropriate default values for new properties
3. **Port Changes**: Changing input/output ports affects React Flow connections
4. **Testing**: Test related functionality after changes
5. **Execute Function**: Any changes to execute function signature affects node execution

## 🌊 React Flow Integration

This system is integrated with React Flow v12 (`@xyflow/react`):

- **Port Mapping**: Input/output array indices map to React Flow handles (`'0'`, `'1'`, etc.)
- **Node Execution**: The nodeExecutionService handles React Flow edges format
- **UI Integration**: Nodes are displayed in the React Flow editor with custom components
- **Edge Format**: Connections use `{ source, target, sourceHandle, targetHandle }` format

## 🧩 Example: Complete Node Implementation

```javascript
// TextUppercaseNode.js
import { createNodeDefinition } from './types.js';

async function executeTextUppercase(node, inputs, context) {
  try {
    const text = inputs.input || '';
    const result = text.toUpperCase();
    
    context.addLog('info', `Converted "${text}" to uppercase`, node.id);
    return result;
  } catch (error) {
    context.addLog('error', `Uppercase conversion failed: ${error.message}`, node.id);
    throw error;
  }
}

export const TextUppercaseNode = createNodeDefinition(
  'Text Uppercase',
  '🔠',
  'teal',
  ['input'],
  ['output'],
  {},
  executeTextUppercase,
  {
    description: 'Converts input text to uppercase',
    category: 'text-processing'
  }
);

export default TextUppercaseNode;
```

This structure makes it easy to add new nodes and ensures compatibility with React Flow.