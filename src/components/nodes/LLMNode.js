import { createNodeDefinition } from './types.js';

/**
 * LLM生成ノードの実行処理
 * @param {Object} node - ノードオブジェクト
 * @param {Object} inputs - 入力データ
 * @param {Object} context - 実行コンテキスト
 * @returns {Promise<string>} LLMからの応答
 */
async function executeLLMNode(node, inputs, context) {
  const temperature = node.data.temperature || 0.7;
  const model = node.data.model;
  const provider = node.data.provider || 'openai';
  const systemPrompt = node.data.systemPrompt || null;
  
  // 入力をそのままLLMに送信
  const inputValues = Object.values(inputs).filter(v => v !== undefined && v !== null);
  if (inputValues.length === 0) {
    throw new Error('LLMノードに入力がありません');
  }
  
  // 最初の入力値をプロンプトとして使用
  const finalPrompt = String(inputValues[0]);
  
  context.addLog('info', `LLMに送信するプロンプト: ${finalPrompt.substring(0, 100)}...`, node.id, { 
    prompt: finalPrompt,
    systemPrompt,
    model,
    temperature,
    provider
  });

  // llmServiceを動的にインポート（循環依存を避けるため）
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

  const result = await llmService.sendMessage(finalPrompt, systemPrompt, nodeSpecificOptions, null);
  context.addLog('info', `LLMからの応答を受信しました`, node.id, { response: result?.substring(0, 100) + '...' });
  
  return result;
}

/**
 * LLM生成ノードの定義
 * AIモデルを使用してテキストを生成する
 */
export const LLMNode = createNodeDefinition(
  'LLM生成',
  '🤖',
  'blue',
  ['input'], // 入力ポート: input
  ['output'], // 出力ポート: output
  {
    temperature: 1.0,
    model: 'gpt-5-nano',
    systemPrompt: ''
  },
  executeLLMNode, // 実行メソッド
  {
    description: 'AI言語モデルを使用してテキストを生成します。システムプロンプト、温度設定、モデル選択が可能。',
    category: 'ai'
  }
);

export default LLMNode;