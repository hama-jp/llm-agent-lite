# 実装TODOリスト: ② LLM呼び出しモニタリング機能

## 0. 共通の知識

このタスクは、アプリケーションのログ機能を強化する取り組みの一部です。このタスクでは、**LLM呼び出しをトレースし、`LangSmith` で可視化する機能**を実装します。

並行して、別の担当者が「[実装TODOリスト: ① ワークフロー実行ログ機能](./todo_feature1_workflow_logs.md)」の実装を行います。

このタスクを実装する際には、ワークフロー実行ログ機能側で生成される `runId` や `nodeId` を、`LangSmith` に送信するトレース情報のメタデータとして付与する必要があります。これにより、`LangSmith` のトレースと、ブラウザに保存される実行ログが紐づき、デバッグ性が向上します。

**関連ドキュメント:**
-   [要件定義書](./requirements_Implement_log.md): 機能全体の背景、目的、データモデル設計などが記載されています。実装前に必ずお読みください。

---

## 1. 環境構築 & 設定
-   [ ] **パッケージインストール**:
    -   `pnpm add langsmith @langchain/langsmith` を実行し、必要なライブラリをインストールする。
-   [ ] **設定UIの追加**:
    -   `src/components/SettingsView.jsx` に、`LangSmith API Key` と `LangSmith Project Name` を入力するためのフォームフィールドを追加する。
    -   APIキーのフィールドは、キーの内容が画面に表示されないよう `type="password"` に設定する。
    -   入力された値は `llmService` の `saveSettings` を通じて `localStorage` に保存されるようにする。

## 2. 連携実装
-   [ ] **`llmService.js` のインポート修正**:
    -   `langsmith` から `Client`、`@langchain/langsmith/wrappers` から `wrapSDK` をインポートする。
-   [ ] **`sendMessage` のシグネチャ変更**:
    -   `sendMessage` 関数が、トレースに必要なコンテキスト情報を受け取れるようにシグネチャ（引数）を変更する。
    -   **変更後 (例):** `async sendMessage(message, systemPrompt, options = {}, context = {})`
    -   `context` オブジェクトには `workflowId`, `runId`, `nodeId` が含まれることを想定する。
-   [ ] **`fetch` のラップ処理実装**:
    -   `sendMessage` 関数内で、`LangSmith API Key` が設定されているかどうかを確認する。
    -   設定されている場合、`wrapSDK` を使用して `fetch` 関数をラップする。設定されていない場合は、通常の `fetch` を使用する。
    -   **具体的なコード例:**
        ```javascript
        // sendMessage 関数内
        const settings = this.getSettings(); // LangSmithの設定を取得
        let fetcher = fetch; // デフォルトは通常のfetch

        if (settings.langSmithApiKey) {
          const client = new Client({
            apiKey: settings.langSmithApiKey,
          });

          fetcher = wrapSDK(fetch, {
            client: client,
            project: settings.langSmithProjectName || 'default-project', // プロジェクト名
            metadata: { // トレースに付与するメタデータ
              workflow_id: context.workflowId,
              run_id: context.runId,
              node_id: context.nodeId,
            },
          });
        }

        // この後の処理では、`fetch` の代わりに `fetcher` を使用する
        const response = await fetcher(apiUrl, { ... });
        ```
-   [ ] **`nodeExecutionService.js` の改修**:
    -   `llmService.sendMessage` を呼び出している箇所で、新しいシグネチャに合わせて `context` オブジェクトを渡すように修正する。

## 3. UI/UX
-   [ ] **(任意) LangSmithへのリンク**:
    -   LLMノードのログ詳細表示部分に、そのノードの実行に対応するLangSmithのトレース画面へのリンクを追加する。これにより、デバッグがさらに容易になる。
