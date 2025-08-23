import { createNodeDefinition } from './types.js';

/**
 * If条件分岐ノードの実行処理
 * 
 * 注意: このメソッドは新しいノードシステム用のプレースホルダーです。
 * 実際の実行は nodeExecutionService.js の executeIfNode メソッドで行われます。
 * 
 * 実際の動作:
 * - 条件がtrueの場合: trueポートに入力値を出力、falseポートはnull
 * - 条件がfalseの場合: falseポートに入力値を出力、trueポートはnull
 * 
 * @param {Object} node - ノードオブジェクト
 * @param {Object} inputs - 入力データ
 * @param {Object} context - 実行コンテキスト
 * @returns {Promise<Object>} 条件分岐結果 { true: value|null, false: value|null }
 */
async function executeIfNode(node, inputs, context) {
  // 注意：If条件分岐は複雑な制御フローのため、
  // nodeExecutionService.js の executeIfNode を使用します
  // この実行メソッドは placeholder として存在します
  
  // プレースホルダーとして基本的な値を返す
  // 実際の実行は nodeExecutionService で行われる
  return inputs.input || '';
}

/**
 * If条件分岐ノードの定義
 * 条件に基づいてワークフローを分岐させる
 * 
 * 動作説明:
 * - 条件がtrueの場合: 入力値をtrueポートに出力
 * - 条件がfalseの場合: 入力値をfalseポートに出力
 * - 使われないポートにはnullが出力される
 */
export const IfNode = createNodeDefinition(
  'If条件分岐',
  '🔀',
  'pink',
  ['input'], // 入力ポート: input
  ['true', 'false'], // 出力ポート: true (条件満たす場合), false (条件満たさない場合)
  {
    conditionType: 'llm',
    condition: '入力が肯定的な内容かどうか判断してください',
    variable: '',
    operator: '==',
    value: '',
    model: 'gpt-5-nano',
    temperature: 0.7
  },
  executeIfNode, // 実行メソッド（プレースホルダー）
  {
    description: '条件に基づいてワークフローを分岐させます。条件がtrueの場合は入力をtrueポートに、falseの場合はfalseポートに流します。LLM判定または変数比較による条件設定が可能。',
    category: 'control-flow'
  }
);

export default IfNode;