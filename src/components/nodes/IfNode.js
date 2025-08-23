import { createNodeDefinition } from './types.js';

/**
 * If条件分岐ノードの実行処理
 * @param {Object} node - ノードオブジェクト
 * @param {Object} inputs - 入力データ
 * @param {Object} context - 実行コンテキスト
 * @returns {Promise<string>} 条件結果に基づく入力値
 */
async function executeIfNode(node, inputs, context) {
  const conditionType = node.data.conditionType || 'llm';
  let conditionResult = false;
  
  if (conditionType === 'llm') {
    const condition = node.data.condition || '';
    const inputValue = inputs.input || '';
    const prompt = `${condition}\n\n入力: ${inputValue}\n\n上記の条件に基づいて、入力が条件を満たすかどうかを判断してください。満たす場合は「true」、満たさない場合は「false」のみを回答してください。`;
    
    try {
      const model = node.data.model;
      const temperature = node.data.temperature;
      const provider = node.data.provider || 'openai';

      // llmServiceを動的にインポート
      const { default: llmService } = await import('../../services/llmService.js');
      
      const currentSettings = llmService.loadSettings();
      const nodeSpecificOptions = {
        provider,
        model,
        temperature,
        apiKey: currentSettings.apiKey,
        baseUrl: currentSettings.baseUrl,
        maxTokens: currentSettings.maxTokens
      };
      
      const response = await llmService.sendMessage(prompt, nodeSpecificOptions);
      conditionResult = response.toLowerCase().includes('true');
    } catch (error) {
      throw new Error(`条件判断エラー: ${error.message}`);
    }
  } else {
    // 変数比較ロジック
    const variable = node.data.variable || '';
    const operator = node.data.operator || '==';
    const value = node.data.value || '';
    const variableValue = context.variables[variable];
    
    switch (operator) {
      case '==': conditionResult = variableValue == value; break;
      case '!=': conditionResult = variableValue != value; break;
      case '>': conditionResult = Number(variableValue) > Number(value); break;
      case '<': conditionResult = Number(variableValue) < Number(value); break;
      case '>=': conditionResult = Number(variableValue) >= Number(value); break;
      case '<=': conditionResult = Number(variableValue) <= Number(value); break;
      default: conditionResult = false;
    }
  }

  const inputValue = inputs.input || '';
  context.addLog('info', `条件分岐の結果: ${conditionResult}`, node.id, { conditionResult, inputValue });
  
  return inputValue;
}

/**
 * If条件分岐ノードの定義
 * 条件に基づいてワークフローを分岐させる
 */
export const IfNode = createNodeDefinition(
  'If条件分岐',
  '🔀',
  'pink',
  ['input'], // 入力ポート: input
  ['true', 'false'], // 出力ポート: true, false
  {
    conditionType: 'llm',
    condition: '入力が肯定的な内容かどうか判断してください',
    variable: '',
    operator: '==',
    value: '',
    model: 'gpt-5-nano',
    temperature: 0.7
  },
  executeIfNode, // 実行メソッド
  {
    description: '条件に基づいてワークフローを分岐させます。LLM判定または変数比較による条件設定が可能。',
    category: 'control-flow'
  }
);

export default IfNode;