# 状態管理の統一化 - Zustand移行TODO

## フェーズ1: 環境準備とストア設計
- [ ] Zustandパッケージのインストール
- [ ] 基本ストア構造の設計
- [ ] 状態スライスの定義
  - [ ] workflowGraphスライス (ノード、エッジ、位置、選択)
  - [ ] executionStateスライス (ノード別ステータス、ログ)
  - [ ] uiStateスライス (パネル、ズーム、モーダル)

## フェーズ2: 基本ストア実装
- [ ] メインストア作成 (`src/store/index.js`)
- [ ] immerとdevtoolsミドルウェア設定
- [ ] 各スライスの実装
  - [ ] workflowSlice.js
  - [ ] executionSlice.js
  - [ ] uiSlice.js

## フェーズ3: コンポーネント移行（段階的）
- [ ] Layout.jsx - UI状態の移行
- [ ] NodeEditor.jsx - ワークフロー状態の移行
- [ ] 実行関連コンポーネントの移行
- [ ] 各段階でテスト実行

## フェーズ4: 永続化とクリーンアップ
- [ ] persist middleware追加
- [ ] localStorage連携
- [ ] 不要なuseState削除
- [ ] 最終動作確認

## 注意点
- 各フェーズで動作確認を行う
- テストが通ることを確認してから次に進む
- エラーが出た場合は即座に修正