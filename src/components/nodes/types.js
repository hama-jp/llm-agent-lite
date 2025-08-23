/**
 * ノード定義の型定義とユーティリティ
 */

/**
 * ノード定義の基本構造
 * @typedef {Object} NodeDefinition
 * @property {string} name - 表示名
 * @property {string} icon - アイコン (絵文字)
 * @property {string} color - グラデーション背景色クラス
 * @property {string} borderColor - ボーダー色クラス
 * @property {string} textColor - テキスト色クラス
 * @property {string[]} inputs - 入力ポート名の配列
 * @property {string[]} outputs - 出力ポート名の配列
 * @property {Object} defaultData - デフォルトデータ
 * @property {Function} execute - 実行メソッド
 * @property {string} [description] - ノードの説明
 * @property {string} [category] - カテゴリー
 */

/**
 * 色テーマの定数
 */
export const NODE_COLORS = {
  orange: {
    color: 'bg-gradient-to-br from-orange-400 to-orange-600',
    borderColor: 'border-orange-300',
    textColor: 'text-white'
  },
  blue: {
    color: 'bg-gradient-to-br from-blue-400 to-blue-600',
    borderColor: 'border-blue-300', 
    textColor: 'text-white'
  },
  green: {
    color: 'bg-gradient-to-br from-green-400 to-green-600',
    borderColor: 'border-green-300',
    textColor: 'text-white'
  },
  teal: {
    color: 'bg-gradient-to-br from-teal-400 to-teal-600',
    borderColor: 'border-teal-300',
    textColor: 'text-white'
  },
  pink: {
    color: 'bg-gradient-to-br from-pink-400 to-pink-600',
    borderColor: 'border-pink-300',
    textColor: 'text-white'
  },
  purple: {
    color: 'bg-gradient-to-br from-purple-400 to-purple-600',
    borderColor: 'border-purple-300',
    textColor: 'text-white'
  },
  amber: {
    color: 'bg-gradient-to-br from-amber-400 to-amber-600',
    borderColor: 'border-amber-300',
    textColor: 'text-white'
  },
  cyan: {
    color: 'bg-gradient-to-br from-cyan-400 to-cyan-600',
    borderColor: 'border-cyan-300',
    textColor: 'text-white'
  }
};

/**
 * ノード定義を作成するヘルパー関数
 * @param {string} name - 表示名
 * @param {string} icon - アイコン
 * @param {keyof NODE_COLORS} colorTheme - 色テーマ
 * @param {string[]} inputs - 入力ポート配列
 * @param {string[]} outputs - 出力ポート配列
 * @param {Object} defaultData - デフォルトデータ
 * @param {Function} execute - 実行メソッド
 * @param {Object} options - オプション設定
 * @returns {NodeDefinition}
 */
export function createNodeDefinition(name, icon, colorTheme, inputs, outputs, defaultData, execute, options = {}) {
  const theme = NODE_COLORS[colorTheme];
  if (!theme) {
    throw new Error(`Unknown color theme: ${colorTheme}`);
  }

  if (typeof execute !== 'function') {
    throw new Error(`Execute method must be a function for node: ${name}`);
  }

  return {
    name,
    icon,
    ...theme,
    inputs: Array.isArray(inputs) ? inputs : [],
    outputs: Array.isArray(outputs) ? outputs : [],
    defaultData: defaultData || {},
    execute,
    description: options.description || '',
    category: options.category || 'general'
  };
}