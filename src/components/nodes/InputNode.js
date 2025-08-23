import { createNodeDefinition } from './types.js';

/**
 * 入力ノードの実行処理
 * @param {Object} node - ノードオブジェクト
 * @param {Object} inputs - 入力データ（通常は空）
 * @param {Object} context - 実行コンテキスト
 * @returns {Promise<string>} 入力値またはファイルコンテンツ
 */
async function executeInputNode(node, inputs, context) {
  if (node.data.inputType === 'file') {
    const value = node.data.fileContent || '';
    context.variables[node.id] = value;
    return value;
  }
  const value = node.data.value || '';
  context.variables[node.id] = value;
  return value;
}

/**
 * 入力ノードの定義
 * ワークフローの開始点として使用される
 */
export const InputNode = createNodeDefinition(
  '入力',
  '📥',
  'orange',
  [], // 入力ポートなし
  ['output'], // 出力ポート: output
  {
    value: '',
    inputType: 'text'
  },
  executeInputNode, // 実行メソッド
  {
    description: 'ワークフローの開始点。テキストまたはファイルを入力として設定できます。',
    category: 'input-output'
  }
);

export default InputNode;