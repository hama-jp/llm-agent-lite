import { createNodeDefinition } from './types.js';

/**
 * テキスト結合ノードの実行処理
 * @param {Object} node - ノードオブジェクト
 * @param {Object} inputs - 入力データ
 * @param {Object} context - 実行コンテキスト
 * @returns {Promise<string>} 結合されたテキスト
 */
async function executeTextCombinerNode(node, inputs, context) {
  const orderedInputNames = ['input1', 'input2', 'input3', 'input4'];
  let combinedText = '';

  // 単純に順番に文字列を結合
  for (const inputName of orderedInputNames) {
    const inputValue = inputs[inputName];
    if (inputValue !== undefined && inputValue !== null) {
      combinedText += String(inputValue);
    }
  }

  context.addLog('info', `テキストを結合しました`, node.id, { result: combinedText });
  return combinedText;
}

/**
 * テキスト結合ノードの定義
 * 複数のテキスト入力を結合する
 */
export const TextCombinerNode = createNodeDefinition(
  'テキスト結合',
  '🔗',
  'teal',
  ['input1', 'input2', 'input3', 'input4'], // 入力ポート: 最大4つ
  ['output'], // 出力ポート: output
  {},
  executeTextCombinerNode, // 実行メソッド
  {
    description: '最大4つのテキスト入力を結合して1つのテキストとして出力します。',
    category: 'text-processing'
  }
);

export default TextCombinerNode;