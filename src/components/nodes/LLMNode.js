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
  const maxTokens = node.data.maxTokens || null;
  
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

  try {
    // llmServiceを動的にインポート（循環依存を避けるため）
    const { default: llmService } = await import('../../services/llmService.js');
    context.addLog('debug', `llmServiceインポート成功`, node.id);
    
    const currentSettings = llmService.loadSettings();
    context.addLog('debug', `現在の設定`, node.id, { currentSettings });
    
    const nodeSpecificOptions = {
      provider,
      model,
      temperature,
      apiKey: currentSettings.apiKey,
      baseUrl: currentSettings.baseUrl,
      maxTokens: maxTokens || currentSettings.maxTokens  // ノード設定を優先、フォールバックでシステム設定
    };
    context.addLog('debug', `ノード固有オプション`, node.id, { 
      nodeSpecificOptions,
      maxTokensSource: maxTokens ? 'node-specific' : 'system-default',
      nodeMaxTokens: maxTokens,
      systemMaxTokens: currentSettings.maxTokens,
      finalMaxTokens: maxTokens || currentSettings.maxTokens
    });

    context.addLog('debug', `llmService.sendMessage呼び出し開始`, node.id);
    
    // 詳細なAPIレスポンス情報を取得するためのテンポラリーな修正
    const result = await llmService.sendMessage(finalPrompt, systemPrompt, nodeSpecificOptions);
    
    // ブラウザコンソールの最新ログ（APIレスポンス）を取得を試みる
    setTimeout(() => {
      if (console.log.lastCall && console.log.lastCall.includes('LLM Response:')) {
        context.addLog('debug', `コンソールからAPIレスポンス情報を取得できませんでした - 直接F12コンソールを確認してください`, node.id);
      }
    }, 100);
    
    context.addLog('debug', `llmService.sendMessage呼び出し完了`, node.id, { 
      resultType: typeof result, 
      resultLength: result?.length,
      result: result,
      isEmptyResponse: result === 'レスポンスが空です'
    });
    
    context.addLog('info', `LLMからの応答を受信しました`, node.id, { response: result?.substring(0, 100) + '...' });
    
    return result;
  } catch (error) {
    context.addLog('error', `LLMノード実行エラー: ${error.message}`, node.id, { error: error.stack });
    throw error;
  }
}

/**
 * LLM生成ノードの定義
 * AIモデルを使用してテキストを生成する
 */
export const LLMNode = createNodeDefinition(
  'LLM Generation',
  '🤖',
  'blue',
  ['input'], // 入力ポート: input
  ['output'], // 出力ポート: output
  {
    temperature: 1.0,
    model: 'gpt-5-nano',
    systemPrompt: '',
    maxTokens: 50000
  },
  executeLLMNode, // 実行メソッド
  {
    description: 'Generate text using AI language models. Supports system prompts, temperature settings, and model selection.',
    category: 'ai'
  }
);

export default LLMNode;