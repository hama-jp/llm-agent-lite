# 🤝 コントリビューションガイド

LLM Agent Lite (flomoji) への貢献に興味を持っていただきありがとうございます！
このドキュメントでは、プロジェクトへの貢献方法について説明します。

## 📋 目次

- [開発環境のセットアップ](#開発環境のセットアップ)
- [プロジェクト構造](#プロジェクト構造)
- [開発フロー](#開発フロー)
- [コーディング規約](#コーディング規約)
- [テストの実行](#テストの実行)
- [新しいノードの追加](#新しいノードの追加)
- [プルリクエストの作成](#プルリクエストの作成)
- [よくある質問](#よくある質問)

## 🚀 開発環境のセットアップ

### 必要な環境

- Node.js 20.x 以上
- pnpm 10.x 以上
- Git

### セットアップ手順

1. **リポジトリをフォーク**
   GitHubでリポジトリをフォークしてください。

2. **ローカルにクローン**
   ```bash
   git clone https://github.com/[your-username]/llm-agent-lite.git
   cd llm-agent-lite
   ```

3. **依存関係のインストール**
   ```bash
   pnpm install
   ```

4. **開発サーバーの起動**
   ```bash
   pnpm run dev
   ```
   ブラウザで `http://localhost:5173` を開きます。

5. **ビルドの確認**
   ```bash
   pnpm run build
   ```

## 📁 プロジェクト構造

```
llm-agent-lite/
├── src/
│   ├── components/         # Reactコンポーネント
│   │   ├── ui/            # UIコンポーネント（shadcn/ui）
│   │   ├── nodes/         # ワークフローノード定義
│   │   ├── NodeEditor.jsx # ノードエディタ
│   │   └── Layout.jsx     # メインレイアウト
│   ├── services/          # ビジネスロジック
│   │   ├── storageService.js        # ストレージ管理
│   │   ├── llmService.js            # LLMプロバイダー管理
│   │   ├── nodeExecutionService.js  # ノード実行エンジン
│   │   └── workflowManagerService.js # ワークフロー管理
│   ├── store/             # Zustand状態管理
│   │   └── store.js       # グローバル状態
│   ├── hooks/             # カスタムReactフック
│   │   └── useWorkflowExecution.js # ワークフロー実行フック
│   └── styles/            # スタイルシート
├── public/                # 静的ファイル
├── tests/                 # テストファイル
└── docs/                  # ドキュメント
```

### 主要なサービスクラス

#### StorageService
ローカルストレージへのアクセスを管理します。
- 設定の保存/読み込み
- ワークフローの永続化
- チャット履歴の管理

#### LLMService
各種LLMプロバイダーとの通信を管理します。
- OpenAI、Anthropic、ローカルLLMの対応
- ストリーミング応答の処理
- エラーハンドリング

#### NodeExecutionService
ワークフローノードの実行を管理します。
- ノードの順序解決
- 変数の管理
- 条件分岐とループの処理

## 🔄 開発フロー

### ブランチ戦略

- `main` - 本番環境用ブランチ
- `feature/*` - 新機能開発
- `fix/*` - バグ修正
- `docs/*` - ドキュメント更新

### 推奨される開発手順

1. **Issue の確認**
   既存のIssueを確認するか、新しいIssueを作成してください。

2. **ブランチの作成**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **コードの記述**
   - 小さくコミット
   - 意味のあるコミットメッセージ

4. **テストの実行**
   ```bash
   pnpm test
   ```

5. **Lintチェック**
   ```bash
   pnpm run lint
   ```

6. **プルリクエストの作成**

## 📝 コーディング規約

### JavaScript/React

- **インデント**: スペース2つ
- **セミコロン**: 不要（ESLint設定に従う）
- **命名規則**:
  - コンポーネント: PascalCase (`NodeEditor.jsx`)
  - 関数/変数: camelCase (`handleNodeClick`)
  - 定数: UPPER_SNAKE_CASE (`MAX_ITERATIONS`)

### コンポーネント構造

```jsx
// 良い例
const MyComponent = ({ prop1, prop2 }) => {
  const [state, setState] = useState(null)
  
  useEffect(() => {
    // 副作用
  }, [依存配列])
  
  const handleAction = useCallback(() => {
    // ハンドラロジック
  }, [依存配列])
  
  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

### 重要な注意点

- **localStorage の使用**: `StorageService` を通じて行う
- **エラーハンドリング**: try-catch を適切に使用
- **React Hooks**: 依存配列を正確に設定
- **パフォーマンス**: `useCallback` と `useMemo` を適切に使用

## 🧪 テストの実行

### 全テストの実行
```bash
pnpm test
```

### ウォッチモード
```bash
pnpm test:watch
```

### カバレッジレポート
```bash
pnpm test:coverage
```

### テストの書き方

```javascript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MyComponent from './MyComponent'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('期待されるテキスト')).toBeInTheDocument()
  })
})
```

## 🔧 新しいノードの追加

新しいワークフローノードを追加する手順：

1. **ノードファイルの作成**
   `src/components/nodes/YourNode.js` を作成

2. **ノード定義の実装**
   ```javascript
   import { createNodeDefinition } from './types.js'
   
   async function executeYourNode(node, inputs, context) {
     // ノードの実行ロジック
     return result
   }
   
   export const YourNode = createNodeDefinition(
     'ノード名',
     '🎯', // アイコン
     'blue', // 色
     ['input'], // 入力ポート
     ['output'], // 出力ポート
     {
       // デフォルトデータ
       property: 'default'
     },
     executeYourNode,
     {
       description: 'ノードの説明',
       category: 'カテゴリ'
     }
   )
   ```

3. **ノードの登録**
   `src/components/nodes/index.js` にエクスポートを追加

4. **テストの作成**
   ノードの動作をテストするファイルを作成

## 📤 プルリクエストの作成

### PR作成前のチェックリスト

- [ ] コードがビルドされる (`pnpm run build`)
- [ ] テストが通る (`pnpm test`)
- [ ] Lintエラーがない (`pnpm run lint`)
- [ ] 新機能の場合、ドキュメントを更新
- [ ] 意味のあるコミットメッセージ

### PRテンプレート

```markdown
## 概要
変更の概要を記載

## 変更内容
- 変更点1
- 変更点2

## テスト方法
1. 手順1
2. 手順2

## スクリーンショット（UIの変更がある場合）
[画像]

## チェックリスト
- [ ] テストを追加/更新した
- [ ] ドキュメントを更新した
- [ ] Breaking changeがない
```

## ❓ よくある質問

### Q: エラー「localStorage is not defined」が出る
A: Node.js環境でlocalStorageにアクセスしようとしています。`StorageService`を使用し、適切にモックしてください。

### Q: React Hookの依存配列の警告が出る
A: useEffect/useCallbackの依存配列に必要な値をすべて含めてください。ESLintの警告に従います。

### Q: 新しいLLMプロバイダーを追加したい
A: `src/services/llmService.js` に新しいプロバイダーのケースを追加し、APIエンドポイントとヘッダーの設定を実装してください。

### Q: ワークフローが正しく実行されない
A: `src/services/nodeExecutionService.js` のデバッグログを有効にして、実行順序と変数の状態を確認してください。

## 📞 サポート

質問や提案がある場合は、以下の方法でお問い合わせください：

- [GitHub Issues](https://github.com/hama-jp/llm-agent-lite/issues) - バグ報告や機能リクエスト
- [GitHub Discussions](https://github.com/hama-jp/llm-agent-lite/discussions) - 一般的な質問や議論

## 📜 ライセンス

このプロジェクトはMITライセンスの下で公開されています。
詳細は[LICENSE](LICENSE)ファイルをご覧ください。

---

貢献していただきありがとうございます！🎉