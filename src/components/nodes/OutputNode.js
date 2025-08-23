import { createNodeDefinition } from './types.js';

/**
 * 出力ノードの実行処理
 * @param {Object} node - ノードオブジェクト
 * @param {Object} inputs - 入力データ
 * @returns {Promise<string>} フォーマットされた出力値
 */
async function executeOutputNode(node, inputs) {
  const format = node.data.format || 'text';
  // Get the first available input value, or fallback to empty string
  const inputValue = Object.values(inputs)[0] || '';
  
  switch (format) {
    case 'json':
      try {
        return JSON.stringify({ output: inputValue }, null, 2);
      } catch {
        return inputValue;
      }
    default:
      return inputValue;
  }
}

/**
 * 出力ノードの定義
 * ワークフローの結果を表示する
 */
export const OutputNode = createNodeDefinition(
  'Output',
  '📤',
  'green',
  ['input'], // 入力ポート: input
  [], // 出力ポートなし
  {
    format: 'text',
    title: 'Result',
    result: ''
  },
  executeOutputNode, // 実行メソッド
  {
    description: 'Display workflow results. Supports text or structured data output.',
    category: 'input-output'
  }
);

export default OutputNode;