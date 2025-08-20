import React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Button } from '@/components/ui/button.jsx'
import { RefreshCw } from 'lucide-react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError() {
    // エラーが発生したときにstateを更新
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // エラーの詳細を記録
    this.setState({
      error: error,
      errorInfo: errorInfo
    })
    
    // エラーをコンソールに出力
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full p-8">
          <div className="max-w-md w-full">
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">エラーが発生しました</h3>
                    <p className="text-sm">
                      アプリケーションでエラーが発生しました。以下のボタンをクリックして再試行してください。
                    </p>
                  </div>
                  
                  {this.state.error && (
                    <details className="text-xs">
                      <summary className="cursor-pointer font-medium">エラー詳細</summary>
                      <div className="mt-2 p-2 bg-white rounded border">
                        <div className="font-mono text-xs break-all">
                          <div className="font-semibold">Error:</div>
                          <div className="mb-2">{this.state.error.toString()}</div>
                          {this.state.errorInfo && (
                            <>
                              <div className="font-semibold">Stack Trace:</div>
                              <pre className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                            </>
                          )}
                        </div>
                      </div>
                    </details>
                  )}
                  
                  <Button 
                    onClick={this.handleReset}
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    再試行
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

