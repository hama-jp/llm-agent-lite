# LLMシステムプロンプト機能実装 - Rollback戦略

## 🚨 緊急時のRollback手順

### 1. 即座のRollback（重大な問題発生時）
```bash
# 現在の作業を保存
git add .
git commit -m "WIP: LLM system prompt implementation in progress"

# 直前の安定版に戻る
git checkout HEAD~1

# 修正ブランチを作成
git checkout -b hotfix-system-prompt-$(date +%Y%m%d-%H%M%S)
```

### 2. 段階的Rollback（特定ファイルのみ）
```bash
# 特定ファイルのみを元に戻す
git checkout HEAD~1 -- src/components/NodeEditor.jsx
git checkout HEAD~1 -- src/components/Layout.jsx
git checkout HEAD~1 -- src/services/llmService.js
git checkout HEAD~1 -- src/services/nodeExecutionService.js
```

## 🔄 段階的実装戦略

### 実装順序と各段階でのチェックポイント
1. **データ構造 (NodeEditor.jsx)** → 新しいLLMノード作成テスト
2. **UI変更 (Layout.jsx)** → プロパティパネル表示テスト  
3. **API修正 (llmService.js)** → API呼び出しテスト
4. **実行連携 (nodeExecutionService.js)** → エンドツーエンドテスト

### 各段階での動作確認項目
- [ ] **データ構造**: 新規LLMノード作成時にsystemPromptフィールドが存在
- [ ] **UI**: LLMノード選択時にシステムプロンプト入力欄が表示
- [ ] **API**: システムプロンプトがAPI呼び出しに正しく含まれる
- [ ] **実行**: ワークフロー実行時にシステムプロンプトが効果を発揮

## 📊 問題検出の指標

### 自動監視項目
- [ ] 既存のLLMノードが正常動作する
- [ ] ワークフロー保存・読み込みでデータが保持される
- [ ] APIエラー率の増加がない
- [ ] テスト失敗がない

### 手動確認項目（各段階で実施）
- [ ] 新しいLLMノードの作成
- [ ] システムプロンプト入力・保存
- [ ] 既存ワークフローの動作確認
- [ ] 各種API Provider（OpenAI、Anthropic）での動作確認

## 🏥 トラブルシューティング

### よくある問題と対処法

#### 1. 既存ワークフローの互換性問題
```javascript
// 安全な旧データ処理
const systemPrompt = node.data.systemPrompt || '';
const prompt = node.data.prompt || ''; // 旧データ対応
```

#### 2. API形式の問題
```bash
# API テスト用スクリプト実行
node scripts/test-api-formats.js
```

#### 3. UI表示の問題
```bash
# 開発サーバー再起動
pnpm run dev

# キャッシュクリア
rm -rf .vite
```

## 📝 各段階での品質チェック

### データ構造変更後
```bash
# 構文チェック
pnpm run lint
# 型チェック
pnpm run typecheck
# 新規ノード作成テスト
npm test -- NodeEditor
```

### UI変更後
```bash
# コンポーネントテスト
npm test -- Layout
# スナップショットテスト更新
npm test -- --updateSnapshot
```

### API修正後
```bash
# サービステスト
npm test -- llmService
# 統合テスト
npm test -- nodeExecutionService
```

## 🚨 緊急停止基準

以下の問題が発生した場合は作業を停止してrollback:
- [ ] 既存ワークフローが動作しなくなる
- [ ] APIエラーが50%以上発生する
- [ ] アプリケーションが起動しなくなる
- [ ] 重要なデータが失われる可能性がある

## 🎯 成功基準

### 各段階の完了基準
1. **データ構造**: `defaultData`に`systemPrompt`が追加され、lintが通る
2. **UI**: システムプロンプト入力欄が表示され、値が保存される
3. **API**: システムプロンプトがAPIリクエストに含まれる
4. **実行**: システムプロンプトを含むワークフローが正常実行される

### 最終確認項目
- [ ] 新機能（システムプロンプト）が正常動作する
- [ ] 既存機能に影響を与えていない
- [ ] 全テストが通る
- [ ] パフォーマンス劣化がない
- [ ] ドキュメントが更新されている

## 🔐 最終確認リスト

実装完了前の必須チェック項目:
- [ ] 全自動テストが通る
- [ ] 既存ワークフローが正常動作する
- [ ] 新機能のエンドツーエンドテストが成功する
- [ ] 各API Provider（OpenAI、Anthropic、Local）で動作確認済み
- [ ] ビルドエラーがない
- [ ] TypeScriptエラーがない
- [ ] ESLintエラーがない
- [ ] 手動での動作確認が完了している