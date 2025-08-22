# Zustand移行 - Rollback戦略

## 🚨 緊急時のRollback手順

### 1. 即座のRollback（開発中断が必要な場合）
```bash
# 現在の作業を保存
git add .
git commit -m "WIP: Zustand migration in progress"

# バックアップブランチに切り替え
git checkout backup-before-zustand-migration

# 新しいブランチで作業再開
git checkout -b rollback-fix-$(date +%Y%m%d-%H%M%S)
```

### 2. 段階的Rollback（部分的な問題がある場合）
```bash
# 特定のコンポーネントのみをrollback
git checkout backup-before-zustand-migration -- src/components/[ComponentName].jsx

# 特定のサービスのみをrollback
git checkout backup-before-zustand-migration -- src/services/[ServiceName].js
```

## 🔄 Feature Flag戦略

### 移行途中での切り替え実装
```javascript
// src/lib/featureFlags.js
export const FEATURE_FLAGS = {
  USE_ZUSTAND: localStorage.getItem('debug-use-zustand') === 'true'
};

// App.jsx内での分岐
const App = () => {
  if (FEATURE_FLAGS.USE_ZUSTAND) {
    return <AppWithZustand />;
  }
  return <AppWithReactState />;
};
```

### デバッグ用の切り替えUI
```javascript
// 開発環境でのみ表示されるトグル
{process.env.NODE_ENV === 'development' && (
  <button onClick={() => {
    localStorage.setItem('debug-use-zustand', 
      localStorage.getItem('debug-use-zustand') === 'true' ? 'false' : 'true'
    );
    window.location.reload();
  }}>
    Toggle Zustand: {FEATURE_FLAGS.USE_ZUSTAND ? 'ON' : 'OFF'}
  </button>
)}
```

## 📊 問題検出の指標

### 自動監視項目
- [ ] ページロード時間の悪化（>3秒）
- [ ] メモリリークの検出
- [ ] コンソールエラーの増加
- [ ] テスト失敗率の上昇（>10%）
- [ ] ビルド時間の大幅増加（>2倍）

### 手動確認項目
- [ ] 基本的なワークフロー作成・実行
- [ ] ノードの追加・削除・接続
- [ ] 設定の保存・読み込み
- [ ] データのインポート・エクスポート
- [ ] チャット機能の動作

## 🏥 トラブルシューティング

### よくある問題と対処法

#### 1. 状態の不整合
```bash
# localStorage をクリア
localStorage.clear()

# 開発サーバー再起動
pnpm run dev
```

#### 2. 依存関係の問題
```bash
# node_modules 再インストール
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

#### 3. 型エラー
```bash
# TypeScript チェック
pnpm run typecheck

# 必要に応じて型定義追加
pnpm add -D @types/[package-name]
```

## 📝 ログ記録

### 問題発生時の記録項目
1. **発生時刻**: YYYY-MM-DD HH:MM:SS
2. **問題の詳細**: エラーメッセージ、再現手順
3. **影響範囲**: 影響を受けるコンポーネント・機能
4. **対処法**: 実行した修正内容
5. **結果**: 問題解決の可否

### 記録テンプレート
```markdown
## 問題レポート [YYYY-MM-DD HH:MM:SS]

**問題**: 
**影響範囲**: 
**再現手順**: 
1. 
2. 
3. 

**対処法**: 
**結果**: 
**今後の予防策**: 
```

## 🎯 成功基準の再定義

### 各フェーズでの完了基準
1. **フェーズ0**: 全ベースラインテストが通る
2. **フェーズ1**: Zustandストアが動作し、既存機能に影響しない
3. **フェーズ2**: 各スライスが独立して動作する
4. **フェーズ3**: 移行したコンポーネントで同等の機能が動作する
5. **フェーズ4**: パフォーマンスが移行前と同等以上

### 各基準の測定方法
- **機能**: 手動テスト + 自動テスト
- **パフォーマンス**: Lighthouse score、メモリ使用量
- **安定性**: 30分間の連続使用でエラーなし

## 🔐 最終確認リスト

移行完了前の必須チェック項目:
- [ ] 全自動テストが通る
- [ ] 手動テストで主要機能が動作する
- [ ] パフォーマンス劣化がない
- [ ] メモリリークがない
- [ ] ビルドエラーがない
- [ ] TypeScriptエラーがない
- [ ] ESLintエラーがない
- [ ] 本番環境でのテストが成功する