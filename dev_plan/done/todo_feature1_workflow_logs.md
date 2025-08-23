# 実装TODOリスト: ① ワークフロー実行ログ機能

## 0. 共通の知識

このタスクは、アプリケーションのログ機能を強化する取り組みの一部です。このタスクでは、**ワークフローの実行履歴と各ノードの入出力をブラウザに永続化する機能**を実装します。

並行して、別の担当者が「[機能要件②: LLM呼び出しモニタリング機能](./todo_feature2_llm_monitoring.md)」の実装を行います。

最終的に、ここで実装する実行ログの `runId` などの識別子が、LLMモニタリング機能側でトレース情報にメタデータとして付与され、両機能が連携することを想定しています。

**関連ドキュメント:**
-   [要件定義書](./requirements_Implement_log.md): 機能全体の背景、目的、データモデル設計などが記載されています。実装前に必ずお読みください。

---

## 1. 基盤構築 (Service & DB)
-   [ ] **パッケージインストール**:
    -   `pnpm add dexie nanoid` を実行し、必要なライブラリをプロジェクトに追加する。
-   [ ] **ログサービスの新規作成**:
    -   `src/services/logService.js` という新しいファイルを作成する。
-   [ ] **データベース定義**:
    -   `logService.js` 内で、`Dexie` を使って `llm_agent_logs` という名称のデータベースを定義する。
    -   要件定義書に従い、主キーには `nanoid` で生成した文字列IDを使用する (`id`)。自動インクリメント (`++id`) は**使用しない**。
    -   **具体的なコード例:**
        ```javascript
        import Dexie from 'dexie';

        const db = new Dexie('llm_agent_logs');
        db.version(1).stores({
          workflow_runs: 'id, workflowId, startedAt, status',
          node_logs: 'id, runId, nodeId, timestamp'
        });
        ```
-   [ ] **CRUD関数の実装**:
    -   `logService.js` 内に、以下の非同期関数を実装する。`nanoid` をインポートして使用する。
        -   `createRun(workflowId, inputData)`: `nanoid()` で `id` を生成し、`workflow_runs` にレコードを追加して `runId` を返す。
        -   `updateRun(runId, data)`: 実行のステータスや終了日時を更新する。
        -   `addNodeLog(logData)`: `nanoid()` で `id` を生成し、`node_logs` に新しいノードログを追加する。
        -   `getRunsForWorkflow(workflowId)`: 特定のワークフローの実行履歴を新しい順に取得する。
        -   `getLogsForRun(runId)`: 特定の実行IDに紐づくノードログを時系列で取得する。
        -   `clearAllLogs()`: すべてのログデータを削除する。

## 2. 実行ロジックへの組込
-   [ ] **`src/services/nodeExecutionService.js` の改修**:
    -   作成した `logService` をインポートする。
    -   クラスのコンストラクタや `startExecution` 内で、実行ごとの `runId` を保持する変数を追加する。
    -   既存のインメモリログ (`this.executionLog`, `this.addLog`) を削除またはコメントアウトする。
-   [ ] **ログ記録処理の置換**:
    -   `startExecution` の開始時に `logService.createRun` を呼び出し、`runId` を取得する。
    -   ワークフロー完了時・エラー時・停止時に `logService.updateRun` を呼び出し、最終的なステータスを記録する。
    -   `addLog` を呼び出していた箇所を、`logService.addNodeLog` の呼び出しに置き換える。`runId`, `nodeId`, `status`, `inputs`, `outputs`, `error` などの詳細な情報を渡すようにする。

## 3. UI実装
-   [ ] **実行履歴コンポーネントの新規作成**:
    -   `src/components/WorkflowHistoryView.jsx` を新規作成する。
    -   このコンポーネントは `workflowId` を props として受け取り、`logService.getRunsForWorkflow` を使って実行履歴のリストを表示する。
    -   リストの各項目をクリックすると、`logService.getLogsForRun` を使ってノードごとの詳細ログを取得し、モーダルウィンドウやアコーディオンなどで表示する。
-   [ ] **既存UIへの組込**:
    -   `src/components/WorkflowView.jsx` に「実行履歴」のようなタブまたはボタンを追加し、クリックすると `WorkflowHistoryView` が表示されるようにする。

## 4. データ管理機能
-   [ ] **設定画面の改修**:
    -   `src/components/DataView.jsx` に、「実行履歴をすべて削除」ボタンを追加する。
    -   このボタンがクリックされたら、確認ダイアログを表示した上で `logService.clearAllLogs()` を呼び出す。
