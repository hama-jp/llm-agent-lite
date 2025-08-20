import { useState, useEffect } from 'react'
import { Save, TestTube, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import llmService from '../services/llmService.js'

const SettingsView = () => {
  const [settings, setSettings] = useState({
    provider: 'openai',
    apiKey: '',
    baseUrl: '',
    model: 'gpt-5-nano',
    temperature: 0.7,
    maxTokens: 2048
  })
  const [testStatus, setTestStatus] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState([])

  useEffect(() => {
    // LLMサービスから設定を読み込み
    setSettings(llmService.loadSettings())
  }, [])

  const handleSave = () => {
    // 設定の検証
    const errors = llmService.validateSettings(settings)
    setValidationErrors(errors)

    if (errors.length > 0) {
      setTestStatus({ type: 'error', message: '設定に問題があります。エラーを確認してください。' })
      return
    }

    // 設定を保存
    llmService.saveSettings(settings)
    setTestStatus({ type: 'success', message: '設定が保存されました' })
    setTimeout(() => setTestStatus(null), 3000)
  }

  const handleTest = async () => {
    if (!settings.apiKey) {
      setTestStatus({ type: 'error', message: 'APIキーを入力してください' })
      return
    }

    setIsLoading(true)
    setTestStatus(null)

    try {
      // 一時的に設定を適用してテスト
      llmService.saveSettings(settings)
      const result = await llmService.testConnection()
      setTestStatus({ type: 'success', message: result.message })
    } catch (error) {
      setTestStatus({ type: 'error', message: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }))
    // バリデーションエラーをクリア
    setValidationErrors([])
    setTestStatus(null)
  }

  const providerOptions = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'local', label: 'ローカルLLM' },
    { value: 'custom', label: 'カスタムAPI' }
  ]

  const modelOptions = {
    openai: ['gpt-5', 'gpt-5-mini', 'gpt-5-nano'],
    anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'],
    local: ['llama2', 'codellama', 'mistral', 'custom-model'],
    custom: ['custom-model']
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>LLMサービス設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* バリデーションエラー表示 */}
          {validationErrors.length > 0 && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* プロバイダー選択 */}
          <div className="space-y-2">
            <Label htmlFor="provider">プロバイダー</Label>
            <Select
              value={settings.provider}
              onValueChange={(value) => handleInputChange('provider', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="プロバイダーを選択" />
              </SelectTrigger>
              <SelectContent>
                {providerOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* APIキー */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">APIキー</Label>
            <Input
              id="apiKey"
              type="password"
              value={settings.apiKey}
              onChange={(e) => handleInputChange('apiKey', e.target.value)}
              placeholder="APIキーを入力してください"
            />
          </div>

          {/* ベースURL（ローカルLLMやカスタムAPI用） */}
          {(settings.provider === 'local' || settings.provider === 'custom') && (
            <div className="space-y-2">
              <Label htmlFor="baseUrl">ベースURL</Label>
              <Input
                id="baseUrl"
                value={settings.baseUrl}
                onChange={(e) => handleInputChange('baseUrl', e.target.value)}
                placeholder="http://localhost:8080/v1"
              />
              <p className="text-xs text-gray-500">
                例: http://localhost:1234/v1 (LM Studio), http://localhost:8080/v1 (Ollama)
              </p>
            </div>
          )}

          {/* モデル選択 */}
          <div className="space-y-2">
            <Label htmlFor="model">モデル</Label>
            {(settings.provider === 'local' || settings.provider === 'custom') ? (
              <Input
                id="model"
                value={settings.model}
                onChange={(e) => handleInputChange('model', e.target.value)}
                placeholder="モデル名を入力してください (例: llama2, mistral, custom-model)"
              />
            ) : (
              <Select
                value={settings.model}
                onValueChange={(value) => handleInputChange('model', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="モデルを選択" />
                </SelectTrigger>
                <SelectContent>
                  {(modelOptions[settings.provider] || []).map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* 温度設定 */}
          <div className="space-y-2">
            <Label htmlFor="temperature">温度 (0.0 - 2.0)</Label>
            <Input
              id="temperature"
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={settings.temperature}
              onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value) || 0)}
            />
            <p className="text-xs text-gray-500">
              低い値ほど一貫性が高く、高い値ほど創造的になります
            </p>
          </div>

          {/* 最大トークン数 */}
          <div className="space-y-2">
            <Label htmlFor="maxTokens">
              {settings.model?.startsWith('gpt-5') ? '最大補完トークン数' : '最大トークン数'}
            </Label>
            <Input
              id="maxTokens"
              type="number"
              min="1"
              max="8192"
              value={settings.maxTokens}
              onChange={(e) => handleInputChange('maxTokens', parseInt(e.target.value) || 1)}
            />
            <p className="text-xs text-gray-500">
              生成される応答の最大長を制限します
            </p>
          </div>

          {/* ステータス表示 */}
          {testStatus && (
            <Alert className={testStatus.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
              {testStatus.type === 'error' ? (
                <AlertCircle className="h-4 w-4 text-red-600" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
              <AlertDescription className={testStatus.type === 'error' ? 'text-red-800' : 'text-green-800'}>
                {testStatus.message}
              </AlertDescription>
            </Alert>
          )}

          {/* ボタン */}
          <div className="flex space-x-2 pt-4">
            <Button onClick={handleSave} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              設定を保存
            </Button>
            <Button
              onClick={handleTest}
              variant="outline"
              disabled={isLoading}
              className="flex-1"
            >
              <TestTube className="h-4 w-4 mr-2" />
              {isLoading ? '接続テスト中...' : '接続テスト'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 使用方法の説明 */}
      <Card>
        <CardHeader>
          <CardTitle>使用方法</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-800 mb-1">OpenAI:</h4>
            <p>OpenAI APIキーを取得し、上記に入力してください。</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 mb-1">Anthropic:</h4>
            <p>Anthropic APIキーを取得し、上記に入力してください。</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 mb-1">ローカルLLM:</h4>
            <p>LM Studio、Ollama、text-generation-webuiなどのローカルサーバーのエンドポイントを設定してください。</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 mb-1">カスタムAPI:</h4>
            <p>OpenAI互換APIのエンドポイントを設定してください。</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SettingsView

