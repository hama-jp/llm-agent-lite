/**
 * 統一されたローカルストレージ管理サービス
 * 
 * 全てのlocalStorageアクセスを一元化し、型安全性とエラーハンドリングを提供します。
 * 新しい開発者が参加しやすくするため、ストレージキーの管理を統一化しています。
 */

class StorageService {
  // ストレージキーの定数定義
  static KEYS = {
    SETTINGS: 'llm-agent-settings',
    WORKFLOWS: 'llm-agent-workflows', 
    CURRENT_WORKFLOW_ID: 'llm-agent-current-workflow-id',
    CHAT_HISTORY: 'llm-agent-chat-history',
    WORKFLOW_HISTORY: 'llm-agent-workflow-history'
  };

  /**
   * データを取得
   * @param {string} key - ストレージキー
   * @param {*} defaultValue - デフォルト値
   * @returns {*} 取得されたデータまたはデフォルト値
   */
  static get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return defaultValue;
      }
      return JSON.parse(item);
    } catch (error) {
      console.warn(`StorageService: Failed to parse data for key "${key}":`, error);
      return defaultValue;
    }
  }

  /**
   * データを保存
   * @param {string} key - ストレージキー  
   * @param {*} value - 保存するデータ
   * @returns {boolean} 保存成功の可否
   */
  static set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`StorageService: Failed to save data for key "${key}":`, error);
      return false;
    }
  }

  /**
   * データを削除
   * @param {string} key - ストレージキー
   * @returns {boolean} 削除成功の可否
   */
  static remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`StorageService: Failed to remove data for key "${key}":`, error);
      return false;
    }
  }

  /**
   * ストレージをクリア
   * @param {string[]} keysToKeep - 保持するキーの配列
   */
  static clear(keysToKeep = []) {
    try {
      const allKeys = Object.values(this.KEYS);
      allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });
      return true;
    } catch (error) {
      console.error('StorageService: Failed to clear storage:', error);
      return false;
    }
  }

  /**
   * ストレージの使用状況を取得
   * @returns {Object} ストレージ使用状況の詳細
   */
  static getUsageInfo() {
    const info = {};
    Object.values(this.KEYS).forEach(key => {
      const item = localStorage.getItem(key);
      info[key] = {
        exists: item !== null,
        size: item ? new Blob([item]).size : 0,
        sizeKB: item ? Math.round(new Blob([item]).size / 1024 * 100) / 100 : 0
      };
    });
    return info;
  }

  // 特定のデータタイプ用のヘルパーメソッド

  /**
   * 設定データを取得
   * @param {Object} defaultSettings - デフォルト設定
   * @returns {Object} 設定データ
   */
  static getSettings(defaultSettings = {}) {
    return this.get(this.KEYS.SETTINGS, defaultSettings);
  }

  /**
   * 設定データを保存
   * @param {Object} settings - 設定データ
   * @returns {boolean} 保存成功の可否
   */
  static setSettings(settings) {
    return this.set(this.KEYS.SETTINGS, settings);
  }

  /**
   * ワークフローデータを取得
   * @param {Object} defaultWorkflows - デフォルトワークフロー
   * @returns {Object} ワークフローデータ
   */
  static getWorkflows(defaultWorkflows = {}) {
    return this.get(this.KEYS.WORKFLOWS, defaultWorkflows);
  }

  /**
   * ワークフローデータを保存
   * @param {Object} workflows - ワークフローデータ
   * @returns {boolean} 保存成功の可否
   */
  static setWorkflows(workflows) {
    return this.set(this.KEYS.WORKFLOWS, workflows);
  }

  /**
   * 現在のワークフローIDを取得
   * @returns {string|null} 現在のワークフローID
   */
  static getCurrentWorkflowId() {
    try {
      // 現在のワークフローIDは文字列として保存されている場合があるので、
      // 直接localStorageから取得してJSONパースエラーを避ける
      return localStorage.getItem(this.KEYS.CURRENT_WORKFLOW_ID);
    } catch (error) {
      console.warn('StorageService: Failed to get current workflow ID:', error);
      return null;
    }
  }

  /**
   * 現在のワークフローIDを設定
   * @param {string} id - ワークフローID
   * @returns {boolean} 保存成功の可否
   */
  static setCurrentWorkflowId(id) {
    try {
      // ワークフローIDは単純な文字列として保存
      localStorage.setItem(this.KEYS.CURRENT_WORKFLOW_ID, id);
      return true;
    } catch (error) {
      console.error('StorageService: Failed to set current workflow ID:', error);
      return false;
    }
  }

  /**
   * チャット履歴を取得
   * @param {Array} defaultHistory - デフォルト履歴
   * @returns {Array} チャット履歴
   */
  static getChatHistory(defaultHistory = []) {
    return this.get(this.KEYS.CHAT_HISTORY, defaultHistory);
  }

  /**
   * チャット履歴を保存
   * @param {Array} history - チャット履歴
   * @param {number} maxItems - 保持する最大アイテム数（デフォルト100）
   * @returns {boolean} 保存成功の可否
   */
  static setChatHistory(history, maxItems = 100) {
    const trimmedHistory = history.slice(-maxItems);
    return this.set(this.KEYS.CHAT_HISTORY, trimmedHistory);
  }
}

export default StorageService;