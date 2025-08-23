# Node Definition System

This directory contains definitions for all node types available in the workflow system.

## 📁 Structure

```
src/components/nodes/
├── types.js              # Base type definitions and helper functions
├── index.js              # Main export file for all node definitions
├── README.md             # This file
├── NodeTemplate.js.template # Template for creating new nodes
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

export const MyNewNode = createNodeDefinition(
  'My New Node',
  '⭐',
  'blue',
  ['input1', 'input2'],
  ['output'],
  {
    setting1: 'default_value',
    setting2: true
  },
  {
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

### `createNodeDefinition(name, icon, colorTheme, inputs, outputs, defaultData, options)`

Helper function to create node definitions.

**Parameters:**
- `name`: Display name of the node
- `icon`: Icon (emoji recommended)
- `colorTheme`: Color theme name
- `inputs`: Array of input port names
- `outputs`: Array of output port names
- `defaultData`: Default data object
- `options`: Optional settings (description, category)

## 💡 Best Practices

1. **File Naming**: Use `[NodeType]Node.js` format
2. **Categories**: Choose appropriate categories based on functionality
3. **Color Themes**: Select intuitive colors based on functionality
4. **Icons**: Use appropriate emojis that represent the functionality
5. **Descriptions**: Write clear descriptions that other developers can understand

## 🔄 Modifying Existing Nodes

When modifying existing node definitions, pay attention to:

1. **Backward Compatibility**: Ensure existing workflows continue to work
2. **Default Values**: Set appropriate default values for new properties
3. **Testing**: Test related functionality after changes

This structure makes it easy to add new nodes and improves code maintainability.