# 状態管理の統一化 - Zustand移行TODO

## フェーズ0: 安全対策と事前準備
- [x] 開発サーバー起動と現状の動作確認
- [x] バックアップブランチの作成 (backup-before-zustand-migration)
- [x] 現状の動作確認テスト作成とベースライン確立
- [x] 各コンポーネントのスモークテスト追加
- [x] rollback戦略の明確化とドキュメント化
- [x] React 19とZustandの互換性確認
- [x] パッケージ互換性チェック（Radix UI等）
- [x] 現在の状態管理パターンの詳細分析
- [x] 依存関係とprops drillingの影響範囲調査

## フェーズ1: 環境準備とストア設計
- [x] Zustandパッケージのインストール
- [x] 基本ストア構造の設計
- [x] 状態スライスの定義
  - [x] workflowGraphスライス (ノード、エッジ、位置、選択)
  - [x] executionStateスライス (ノード別ステータス、ログ)
  - [x] uiStateスライス (パネル、ズーム、モーダル)
- [x] テスト実行

## フェーズ2: 基本ストア実装
- [x] メインストア作成 (`src/store/index.js`)
- [x] immerとdevtoolsミドルウェア設定
- [x] 各スライスの実装
  - [x] workflowSlice.js
  - [x] テスト実行
  - [x] executionSlice.js
  - [x] テスト実行
  - [x] uiSlice.js
  - [x] テスト実行
- [x] テスト実行

## フェーズ3: コンポーネント移行（段階的）

### 3.1: Layout.jsx - UI状態の移行
- [x] currentView状態をuiSliceに移行
- [x] editingNode状態をuiSliceに移行
- [x] Layout.jsxでZustandストア使用に変更
- [x] Layout.jsx単体テスト実行
- [x] 画面遷移の動作確認
- [x] サイドバー表示の動作確認

### 3.2: NodeEditor.jsx - ワークフロー状態の移行
- [x] selectedNode状態をworkflowSliceに移行
- [x] ノード位置状態をworkflowSliceに移行
- [x] ノード編集状態をworkflowSliceに移行
- [x] NodeEditor.jsxでZustandストア使用に変更
- [x] NodeEditor.jsx単体テスト実行
- [x] ノード選択機能の動作確認
- [x] ノード編集機能の動作確認
- [x] ノード配置機能の動作確認

### 3.3: WorkflowView.jsx - ワークフロー表示の移行
- [x] ワークフロー実行状態をexecutionSliceに移行
- [x] ワークフロー表示状態をuiSliceに移行
- [x] WorkflowView.jsxでZustandストア使用に変更
- [x] WorkflowView.jsx単体テスト実行
- [x] ワークフロー実行の動作確認
- [x] 実行状況表示の動作確認

### 3.4: 実行関連コンポーネントの移行
- [x] 実行ログ状態をexecutionSliceに移行
- [x] 実行進捗状態をexecutionSliceに移行
- [x] 実行関連コンポーネントでZustandストア使用に変更
- [x] 実行関連コンポーネントの単体テスト実行
- [x] 実行ログ表示の動作確認
- [x] 進捗表示の動作確認

### 3.5: 統合テスト
- [x] 全コンポーネント間の状態連携テスト
- [x] ワークフロー全体の動作確認
- [x] エラーハンドリングの動作確認
- [x] パフォーマンステスト実行

## フェーズ4: 永続化とクリーンアップ
- [x] persist middleware追加
- [x] localStorage連携
- [x] 不要なuseState削除
- [x] 最終動作確認

## 注意点
- 各フェーズで動作確認を行う
- テストが通ることを確認してから次に進む
- エラーが出た場合は即座に修正