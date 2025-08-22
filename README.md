# 🌊 flomoji

**A lightweight LLM agent development tool that runs entirely in your browser**

flomoji enables AI conversations and workflow automation without complex setup.
Supporting various AI providers including OpenAI, Anthropic, and local LLMs,
it streamlines your work through prompt chaining and multi-step processing.

✨ **Features**
- 🚀 Browser-only operation, no installation required
- 💬 Real-time AI conversations with chat history management
- 🔗 Workflow automation through prompt chaining
- 🔌 Multiple LLM provider support (OpenAI/Anthropic/Local LLMs)
- 📊 Data management and export capabilities


**ブラウザだけで動く、軽量LLMエージェント開発ツール**

flomojiは、複雑な環境構築なしにAIとの対話やワークフロー自動化を実現する軽量ツールです。
OpenAI、Anthropic、ローカルLLMなど様々なAIプロバイダーに対応し、
プロンプトチェーンによる多段階処理で作業を効率化できます。

✨ **特徴**
- 🚀 ブラウザ単体で動作、インストール不要
- 💬 リアルタイムAI対話とチャット履歴管理  
- 🔗 プロンプトチェーンによるワークフロー自動化
- 🔌 複数のLLMプロバイダー対応（OpenAI/Anthropic/ローカルLLM）
- 📊 データ管理・エクスポート機能


## 使用方法

### 1. 初期設定
1. 設定画面でLLMプロバイダーを選択
2. APIキーまたはエンドポイントを設定
3. 接続テストで動作確認

### 2. チャット機能の使用
1. チャット画面でメッセージを入力
2. LLMからの応答を確認
3. 履歴は自動的に保存されます

### 3. ワークフロー機能の使用
1. ワークフロー画面で入力テキストを設定
2. 実行したいワークフローを選択
3. 「実行」ボタンで処理開始
4. 進捗と結果をリアルタイムで確認

### 4. データ管理
1. データ管理画面でデータの確認・エクスポート
2. 必要に応じてデータのバックアップ作成
3. 他の環境へのデータ移行も可能

### 5. ビルド不要で利用する
ビルド環境がないPCでも、以下の方法でアプリケーションを直接利用できます。

1. **ZIPファイルのダウンロード**:
   - [こちらのリンク](https://github.com/hama-jp/llm-agent-lite/archive/refs/heads/gh-pages.zip)から最新のビルド済みアプリケーションをダウンロードします。

2. **ファイルの展開**:
   - ダウンロードしたZIPファイルを展開（解凍）します。

3. **ブラウザで開く**:
   - 展開したフォルダの中にある`index.html`ファイルを、お使いのウェブブラウザ（Chrome, Firefox, Edgeなど）で開きます。

これだけで、すぐにアプリケーションを使い始めることができます。

## 技術仕様

### フロントエンド
- **React 18**: モダンなUIライブラリ
- **Vite**: 高速なビルドツール
- **Tailwind CSS**: ユーティリティファーストCSS
- **shadcn/ui**: 高品質なUIコンポーネント
- **Lucide React**: アイコンライブラリ

### データ保存
- **LocalStorage**: ブラウザローカルでのデータ永続化
- **JSON形式**: データのインポート・エクスポート

### API通信
- **Fetch API**: HTTP通信
- **CORS対応**: クロスオリジンリクエスト対応
- **エラーハンドリング**: 接続エラーの適切な処理

## デプロイ方法

### 静的ホスティング
```bash
# ビルド
pnpm run build

# distフォルダを静的ホスティングサービスにデプロイ
# 例: Netlify, Vercel, GitHub Pages など
```

### ローカル実行
```bash
# 開発サーバー起動
pnpm run dev

# ブラウザで http://localhost:5173 にアクセス
```

## セキュリティ

- APIキーはブラウザのLocalStorageに保存されます
- データは全てクライアントサイドで処理されます
- サーバーサイドでのデータ保存は行いません

## ライセンス

MIT License

## 開発者向け情報

### プロジェクト構造
```
src/
├── components/          # Reactコンポーネント
│   ├── Layout.jsx      # レイアウトコンポーネント
│   ├── ChatView.jsx    # チャット画面
│   ├── WorkflowView.jsx # ワークフロー画面
│   ├── DataView.jsx    # データ管理画面
│   └── SettingsView.jsx # 設定画面
├── services/           # ビジネスロジック
│   ├── llmService.js   # LLM API通信
│   └── workflowService.js # ワークフロー管理
└── App.jsx            # メインアプリケーション
```

### カスタマイズ

#### 新しいLLMプロバイダーの追加
1. `src/services/llmService.js`にプロバイダー設定を追加
2. `src/components/SettingsView.jsx`に設定UIを追加

#### ワークフローテンプレートの追加
1. `src/services/workflowService.js`の`getTemplates()`メソッドを編集
2. 新しいテンプレートを配列に追加

## サポート

問題や要望がある場合は、GitHubのIssuesでお知らせください。

