import { createNodeDefinition } from './types.js';

/**
 * While繰り返しノードの実行処理
 * @param {Object} node - ノードオブジェクト
 * @param {Object} inputs - 入力データ
 * @param {Object} context - 実行コンテキスト
 * @returns {Promise<string>} 処理結果
 */
async function executeWhileNode(_node, _inputs, _context) {
  // 注意：While ループは複雑な制御フローのため、
  // nodeExecutionService.js の executeWhileNode を使用します
  // この実行メソッドは placeholder として存在します
  throw new Error('While ノードは現在、従来の実行システムを使用します');
}

/**
 * While繰り返しノードの定義
 * 条件が満たされる間、処理を繰り返す
 */
export const WhileNode = createNodeDefinition(
  'While繰り返し',
  '🔄',
  'purple',
  ['input', 'loop'], // 入力ポート: input, loop
  ['output', 'loop'], // 出力ポート: output, loop
  {
    conditionType: 'variable',
    condition: '',
    variable: 'counter',
    operator: '<',
    value: '10',
    maxIterations: 100
  },
  executeWhileNode, // 実行メソッド（placeholder）
  {
    description: '条件が満たされる間、処理を繰り返します。変数条件による制御とループ回数制限が可能。',
    category: 'control-flow'
  }
);

export default WhileNode;