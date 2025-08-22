# 実装TODOリスト: ② LLM呼び出しモニタリング機能

## 0. 共通の知識

このタスクは、アプリケーションのログ機能を強化する取り組みの一部です。このタスクでは、**LLM呼び出しをトレースし、`LangSmith` で可視化する機能**を実装します。

並行して、別の担当者が「[機能要件①: ワークフロー実行ログ機能](./todo_feature1_workflow_logs.md)」の実装を行います。

このタスクを実装する際には、ワークフロー実行ログ機能側で生成される `runId` や `nodeId` を、`LangSmith` に送信するトレース情報のメタデータとして付与する必要があります。これにより、`LangSmith` のトレースと、ブラウザに保存される実行ログが紐づき、デバッグ性が向上します。

**関連ドキュメント:**
-   [要件定義書](./requirements_Implement_log.md): 機能全体の背景、目的、データモデル設計などが記載されています。実装前に必ずお読みください。

---

## 1. 環境構築 & 設定
-   [ ] **パッケージインストール**:
    -   `pnpm add langsmith @langchain/langsmith` を実行し、必要なライブラリをインストールする。
-   [ ] **設定UIの追加**:
    -   `src/components/SettingsView.jsx` に、`LangSmith API Key` と `LangSmith Project Name` を入力するためのフォームフィールドを追加する。
    -   入力された値は `llmService` の `saveSettings` を通じて `localStorage` に保存されるようにする。

## 2. 連携実装
-   [ ] **`llmService.js` の改修**:
    -   `langsmith` から `Client`、`@langchain/langsmith/wrappers` から `wrapSDK` をインポートする。
-   [ ] **`fetch` のラップ**:
    -   `sendMessage` 関数内で、`LangSmith API Key` が設定されているかどうかを確認する。
    -   設定されている場合、`wrapSDK` を使用して `fetch` 関数をラップする。
    -   `wrapSDK` のオプションで、`project` 名や、`workflowId`, `runId`, `nodeId` などのメタデータを渡すように設定し、トレースをリッチにする。
    -   ラップされた `fetch` を使ってAPIリクエストを実行する。

## 3. UI/UX
-   [ ] **(任意) LangSmithへのリンク**:
    -   LLMノードのログ詳細表示部分に、そのノードの実行に対応するLangSmithのトレース画面へのリンクを追加する。これにより、デバッグがさらに容易になる。
