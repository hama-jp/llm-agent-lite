# 現在の状態管理パターン分析

**分析日**: 2025-08-21  
**対象**: React状態管理の現状とZustand移行への影響調査

## 📊 現状の状態分布

### App.jsx (ルートレベル)
```javascript
// UI状態
const [currentView, setCurrentView] = useState('workflow')

// NodeEditorから引き上げられた状態
const [selectedNode, setSelectedNode] = useState(null)
const [editingNode, setEditingNode] = useState(null)
```

### NodeEditor.jsx (最大の状態管理)
**19個のuseState** が確認され、最も複雑な状態管理を持つ:

#### ワークフロー関連
```javascript
const [currentWorkflow, setCurrentWorkflow] = useState(null)
const [workflows, setWorkflows] = useState([])
const [nodes, setNodes] = useState([])
const [connections, setConnections] = useState([])
```

#### インタラクション状態
```javascript
const [draggedNode, setDraggedNode] = useState(null)
const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
const [isConnecting, setIsConnecting] = useState(false)
const [connectionStart, setConnectionStart] = useState(null)
const [selectedConnection, setSelectedConnection] = useState(null)
const [draggingLine, setDraggingLine] = useState(null)
const [nodeResizing, setNodeResizing] = useState(null)
const [contextMenu, setContextMenu] = useState(null)
const [isRenaming, setIsRenaming] = useState(false)
```

#### 実行状態
```javascript
const [executionResult, setExecutionResult] = useState(null)
const [executionState, setExecutionState] = useState({ 
  running: false, 
  currentNodeId: null, 
  executedNodeIds: new Set() 
})
const [executor, setExecutor] = useState(null)
```

#### デバッグ・ログ
```javascript
const [showDebugLog, setShowDebugLog] = useState(false)
const [debugLog, setDebugLog] = useState([])
```

#### 描画関連
```javascript
const [connectionPaths, setConnectionPaths] = useState([])
```

### その他コンポーネント
- **ChatView**: 4個のuseState (messages, inputValue, isLoading, error)
- **SettingsView**: 4個のuseState (settings, testStatus, isLoading, validationErrors)
- **DataView**: 2個のuseState (chatHistory, workflowData)
- **Layout**: 1個のuseState (sidebarOpen)

## 🔍 問題点の特定

### 1. Props Drilling
```
App.jsx 
  ↓ (4 props)
Layout.jsx 
  ↓ (4 props)
WorkflowView.jsx 
  ↓ (4 props)
NodeEditor.jsx
```

**問題**: `selectedNode`, `editingNode`とその更新関数が3層を通過

### 2. 状態の分散
- **UI状態**: App.jsx, Layout.jsx に分散
- **ワークフロー状態**: NodeEditor.jsx に集中
- **実行状態**: NodeEditor.jsx 内で混在
- **アプリケーション状態**: 各コンポーネントに分散

### 3. 相互依存関係
```javascript
// App.jsx → NodeEditor.jsx
selectedNode ←→ editingNode

// NodeEditor.jsx 内部
currentWorkflow → nodes → connections → executionState
draggedNode → dragOffset → isConnecting
```

### 4. localStorage使用パターン
各コンポーネントで直接localStorage操作:
- NodeEditor: ワークフロー管理
- ChatView: チャット履歴
- SettingsView: 設定情報
- DataView: データ管理

## 🎯 Zustand移行のスライス設計

### 推奨スライス分割

#### 1. uiSlice
```javascript
// App.jsx + Layout.jsx の状態
{
  currentView: 'workflow',
  sidebarOpen: true,
  selectedNode: null,
  editingNode: null,
  contextMenu: null,
  showDebugLog: false
}
```

#### 2. workflowSlice  
```javascript
// ワークフローの中核データ
{
  currentWorkflow: null,
  workflows: [],
  nodes: [],
  connections: [],
  connectionPaths: []
}
```

#### 3. interactionSlice
```javascript
// ドラッグ＆ドロップ、UI操作
{
  draggedNode: null,
  dragOffset: { x: 0, y: 0 },
  isConnecting: false,
  connectionStart: null,
  selectedConnection: null,
  draggingLine: null,
  nodeResizing: null,
  isRenaming: false
}
```

#### 4. executionSlice
```javascript
// ワークフロー実行状態
{
  executionResult: null,
  executionState: { 
    running: false, 
    currentNodeId: null, 
    executedNodeIds: new Set() 
  },
  executor: null,
  debugLog: []
}
```

#### 5. persistSlice (永続化)
```javascript
// localStorage連携
{
  chatHistory: [],
  settings: {},
  workflowData: []
}
```

## 🔄 移行戦略の優先順位

### フェーズ1: UI状態の統一
1. **App.jsx** → uiSlice移行
2. **Layout.jsx** → uiSlice移行
3. Props drilling除去の確認

### フェーズ2: ワークフローデータ
1. **NodeEditor.jsx** ワークフロー関連状態 → workflowSlice
2. ワークフロー操作の動作確認

### フェーズ3: インタラクション
1. **NodeEditor.jsx** ドラッグ操作状態 → interactionSlice
2. UI操作の滑らかさ確認

### フェーズ4: 実行エンジン
1. **NodeEditor.jsx** 実行関連状態 → executionSlice
2. ワークフロー実行の動作確認

### フェーズ5: 永続化とその他
1. **各コンポーネント** のlocalStorage → persistSlice
2. **ChatView, SettingsView, DataView** の状態移行

## ⚠️ 移行時の注意事項

### 高リスク箇所
1. **NodeEditor.jsx**: 状態が複雑に絡み合っている
2. **実行状態**: `executedNodeIds: new Set()`のような複雑なオブジェクト
3. **useCallback依存関係**: 状態変更により再レンダリング影響

### テスト重点箇所
1. **ワークフローの作成・編集・削除**
2. **ノードのドラッグ&ドロップ**
3. **ワークフロー実行**
4. **設定の保存・読み込み**
5. **チャット履歴の管理**

## 📈 期待される改善効果

### パフォーマンス
- 不要な再レンダリング削減（セレクタ使用）
- Props drilling除去によるコンポーネント最適化

### 開発効率
- 状態の可視化（Zustand DevTools）
- デバッグの容易化
- コンポーネント間の疎結合

### 保守性
- 状態管理ロジックの集約
- 一貫した状態更新パターン
- 型安全性の向上

---

*この分析に基づいて、段階的で安全なZustand移行を実施します。*