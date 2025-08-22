# TODOリスト: LLMノードへのシステムプロンプト設定機能

これは、LLMノードにシステムプロンプトを設定する機能の実装に必要な、ファイルごとの具体的な作業リストです。各セクションの最後には品質保証のためのステップが含まれています。

## 1. データ構造の定義 (`src/components/NodeEditor.jsx`)

- [ ] `nodeTypes` 定数を探す。
- [ ] `llm` オブジェクト内の `defaultData` プロパティを特定する。
- [ ] `defaultData` から `prompt` キーを削除し、`systemPrompt: ''` を追加する。
  - **変更前:** `defaultData: { temperature: 1.0, model: 'gpt-5-nano', prompt: '' }` (※もしあれば)
  - **変更後:** `defaultData: { temperature: 1.0, model: 'gpt-5-nano', systemPrompt: '' }`
- [ ] **品質保証:**
  - [ ] `npm run lint` を実行し、構文エラーがないことを確認する。

## 2. UIの変更 (`src/components/Layout.jsx`)

- [ ] `NodePropertiesPanel` コンポーネントを探す。
- [ ] `editingNode.type === 'llm'` の条件でレンダリングされるJSXブロックを見つける。
- [ ] 既存の「プロンプト」用の `<textarea>` を**削除**する。
- [ ] 以下の構造で「システムプロンプト」用の `div` を追加する:
  ```jsx
  <div>
    <label className="block text-xs font-medium mb-1 text-gray-600">システムプロンプト</label>
    <textarea
      value={editingNode.data.systemPrompt || ''}
      onChange={(e) => handleDataChange({ systemPrompt: e.target.value })}
      className="w-full px-2 py-1.5 text-sm border rounded-md"
      rows={5}
      placeholder="LLMの役割や応答に関する指示を入力..."
    />
  </div>
  ```
- [ ] **品質保証:**
  - [ ] `npm run test` を実行し、関連するUIテストがパスすることを確認する（特にスナップショットテスト）。
  - [ ] `npm run lint` を実行し、構文エラーがないことを確認する。

## 3. APIリクエストの修正 (`src/services/llmService.js`)

- [ ] `sendMessage` 関数のシグネチャを `async sendMessage(message, systemPrompt, options = {})` に変更する。
- [ ] `sendMessage` 関数の冒頭で、APIリクエストの `messages` 配列を構築するロジックを追加する。
  ```javascript
  const messages = [];
  if (systemPrompt && typeof systemPrompt === 'string' && systemPrompt.trim() !== '') {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: message });
  ```
- [ ] `switch (provider)` 文の中を修正する。
- [ ] **`case 'openai'`, `case 'local'`, `case 'custom'`:**
  - `body` オブジェクトの `messages` プロパティを、上で作成した `messages` 配列で上書きする (`body.messages = messages`)。
- [ ] **`case 'anthropic'`:**
  - `body` オブジェクトを修正し、`systemPrompt` が存在する場合にトップレベルの `system` キーを追加する。
- [ ] **品質保証:**
  - [ ] `llmService` に関連するユニットテストがあれば、それを更新・実行する。
  - [ ] `npm run lint` を実行し、構文エラーがないことを確認する。

## 4. 実行ロジックの連携 (`src/services/nodeExecutionService.js`)

- [ ] `executeLLMNode` 関数を探す。
- [ ] `executeLLMNode` 内で、既存の `prompt` の処理を削除する。入力は `inputs` からのみ取得するようにする。
- [ ] `llmService.sendMessage` を呼び出す直前で、`systemPrompt` を `node.data` から取得する。
  ```javascript
  const systemPrompt = node.data.systemPrompt || null;
  ```
- [ ] `llmService.sendMessage` の呼び出し部分を修正し、`systemPrompt` を第二引数として渡す。
  - **変更後:** `const response = await llmService.sendMessage(finalPrompt, systemPrompt, nodeSpecificOptions);`
- [ ] **品質保証:**
  - [ ] `nodeExecutionService.test.js` を更新し、LLMノード実行時に `systemPrompt` が正しく渡されることを検証するテストケースを追加する。
  - [ ] `npm run test` を実行し、すべてのテストがパスすることを確認する。
  - [ ] `npm run lint` を実行し、構文エラーがないことを確認する。

---
以上で、実装に必要な全ての変更点が網羅されています。
