# 状態管理の統一化 - Zustand移行TODO

## フェーズ0: 安全対策と事前準備
- [ ] 開発サーバー起動と現状の動作確認
- [ ] バックアップブランチの作成 (backup-before-zustand-migration)
- [ ] 現状の動作確認テスト作成とベースライン確立
- [ ] 各コンポーネントのスモークテスト追加
- [ ] rollback戦略の明確化とドキュメント化
- [ ] React 19とZustandの互換性確認
- [ ] パッケージ互換性チェック（Radix UI等）
- [ ] 現在の状態管理パターンの詳細分析
- [ ] 依存関係とprops drillingの影響範囲調査

## フェーズ1: 環境準備とストア設計
- [ ] Zustandパッケージのインストール
- [ ] 基本ストア構造の設計
- [ ] 状態スライスの定義
  - [ ] workflowGraphスライス (ノード、エッジ、位置、選択)
  - [ ] executionStateスライス (ノード別ステータス、ログ)
  - [ ] uiStateスライス (パネル、ズーム、モーダル)
- [ ] テスト実行

## フェーズ2: 基本ストア実装
- [ ] メインストア作成 (`src/store/index.js`)
- [ ] immerとdevtoolsミドルウェア設定
- [ ] 各スライスの実装
  - [ ] workflowSlice.js
  - [ ] テスト実行
  - [ ] executionSlice.js
  - [ ] テスト実行
  - [ ] uiSlice.js
  - [ ] テスト実行
- [ ] テスト実行

## フェーズ3: コンポーネント移行（段階的）

### 3.1: Layout.jsx - UI状態の移行
- [ ] currentView状態をuiSliceに移行
- [ ] editingNode状態をuiSliceに移行
- [ ] Layout.jsxでZustandストア使用に変更
- [ ] Layout.jsx単体テスト実行
- [ ] 画面遷移の動作確認
- [ ] サイドバー表示の動作確認

### 3.2: NodeEditor.jsx - ワークフロー状態の移行
- [ ] selectedNode状態をworkflowSliceに移行
- [ ] ノード位置状態をworkflowSliceに移行
- [ ] ノード編集状態をworkflowSliceに移行
- [ ] NodeEditor.jsxでZustandストア使用に変更
- [ ] NodeEditor.jsx単体テスト実行
- [ ] ノード選択機能の動作確認
- [ ] ノード編集機能の動作確認
- [ ] ノード配置機能の動作確認

### 3.3: WorkflowView.jsx - ワークフロー表示の移行
- [ ] ワークフロー実行状態をexecutionSliceに移行
- [ ] ワークフロー表示状態をuiSliceに移行
- [ ] WorkflowView.jsxでZustandストア使用に変更
- [ ] WorkflowView.jsx単体テスト実行
- [ ] ワークフロー実行の動作確認
- [ ] 実行状況表示の動作確認

### 3.4: 実行関連コンポーネントの移行
- [ ] 実行ログ状態をexecutionSliceに移行
- [ ] 実行進捗状態をexecutionSliceに移行
- [ ] 実行関連コンポーネントでZustandストア使用に変更
- [ ] 実行関連コンポーネントの単体テスト実行
- [ ] 実行ログ表示の動作確認
- [ ] 進捗表示の動作確認

### 3.5: 統合テスト
- [ ] 全コンポーネント間の状態連携テスト
- [ ] ワークフロー全体の動作確認
- [ ] エラーハンドリングの動作確認
- [ ] パフォーマンステスト実行

## フェーズ4: 永続化とクリーンアップ
- [ ] persist middleware追加
- [ ] localStorage連携
- [ ] 不要なuseState削除
- [ ] 最終動作確認

## 注意点
- 各フェーズで動作確認を行う
- テストが通ることを確認してから次に進む
- エラーが出た場合は即座に修正