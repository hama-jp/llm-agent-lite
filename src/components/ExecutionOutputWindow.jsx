import React, { useState } from 'react';
import { X, Minimize2, Maximize2, Terminal, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

const ExecutionOutputWindow = ({ 
  isOpen, 
  onClose, 
  executionResult, 
  debugLog, 
  executionState 
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  if (!isOpen) return null;

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getLogLevelIcon = (level) => {
    switch (level) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Terminal className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div
      className="fixed z-50 bg-white rounded-lg shadow-2xl border"
      style={{
        left: position.x,
        top: position.y,
        width: isMinimized ? '300px' : '600px',
        height: isMinimized ? '40px' : '400px',
        minWidth: '300px',
        minHeight: isMinimized ? '40px' : '200px'
      }}
    >
      {/* ヘッダー */}
      <div
        className="flex items-center justify-between p-3 bg-gray-50 rounded-t-lg cursor-move border-b"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center space-x-2">
          <Terminal className="h-4 w-4 text-gray-600" />
          <span className="font-medium text-sm">Execution Output</span>
          {executionState?.running && (
            <Badge variant="outline" className="text-xs">Running</Badge>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-6 w-6 p-0"
          >
            {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* コンテンツ */}
      {!isMinimized && (
        <div className="h-full pb-12 overflow-hidden">
          <Tabs defaultValue="result" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 m-2">
              <TabsTrigger value="result">Result</TabsTrigger>
              <TabsTrigger value="logs">Debug Log ({debugLog?.length || 0})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="result" className="flex-1 p-3 overflow-auto">
              {executionResult ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    {executionResult.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className="font-medium">
                      {executionResult.success ? 'Execution Completed' : 'Execution Failed'}
                    </span>
                  </div>
                  
                  {executionResult.success ? (
                    <div className="space-y-2">
                      {executionResult.outputs && Object.keys(executionResult.outputs).length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm text-gray-700 mb-2">Outputs:</h4>
                          <div className="space-y-1">
                            {Object.entries(executionResult.outputs).map(([key, value]) => (
                              <div key={key} className="bg-gray-50 p-2 rounded text-sm">
                                <strong>{key}:</strong> {String(value)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {executionResult.variables && Object.keys(executionResult.variables).length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm text-gray-700 mb-2">Variables:</h4>
                          <div className="space-y-1">
                            {Object.entries(executionResult.variables).map(([key, value]) => (
                              <div key={key} className="bg-blue-50 p-2 rounded text-sm">
                                <strong>{key}:</strong> {String(value)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-red-50 p-3 rounded">
                      <p className="text-red-700 text-sm">{executionResult.error}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No execution result yet</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="logs" className="flex-1 p-3 overflow-auto">
              {debugLog && debugLog.length > 0 ? (
                <div className="space-y-1">
                  {debugLog.map((log, index) => (
                    <div key={index} className="flex items-start space-x-2 text-xs p-2 rounded bg-gray-50">
                      {getLogLevelIcon(log.level)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-500">{formatTimestamp(log.timestamp)}</span>
                          {log.nodeId && (
                            <Badge variant="outline" className="text-xs">{log.nodeId}</Badge>
                          )}
                        </div>
                        <p className="mt-1 break-words">{log.message}</p>
                        {log.data && (
                          <pre className="mt-1 text-xs bg-gray-100 p-1 rounded overflow-x-auto">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No debug logs yet</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default ExecutionOutputWindow;