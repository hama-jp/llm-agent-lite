import { useCallback } from 'react'
import nodeExecutionService from '../services/nodeExecutionService.js'

const useWorkflowExecution = ({
  nodes,
  connections,
  nodeTypes,
  setNodes,
  setExecutor,
  setExecutionState,
  setExecutionResult,
  setDebugLog,
  onSelectedNodeChange,
  selectedNode,
  executor
}) => {

  const preprocessNodesForExecution = useCallback(() => {
    return nodes.map(node => {
      if (node.type === 'output' && node.data.result) {
        return { ...node, data: { ...node.data, result: '' } };
      }
      if (node.type === 'llm' && node.data.currentPrompt) {
        return { ...node, data: { ...node.data, currentPrompt: '' } };
      }
      return node;
    });
  }, [nodes]);

  const processExecutionCompletion = useCallback(() => {
    const finalContext = nodeExecutionService.executionContext;
    const executionLog = nodeExecutionService.getExecutionLog();
    let newSelectedNode = null;

    setNodes(prevNodes => {
      const newNodes = prevNodes.map(node => {
        // Output ノードの結果を更新
        if (node.type === 'output' && finalContext[node.id] !== undefined) {
          const updatedNode = { ...node, data: { ...node.data, result: String(finalContext[node.id]) } };
          if (selectedNode && selectedNode.id === node.id) newSelectedNode = updatedNode;
          return updatedNode;
        }
        
        // LLM ノードのプロンプト情報を更新
        if (node.type === 'llm') {
          // 実行ログからLLMノードのプロンプト情報を取得
          const llmLogEntry = executionLog.find(log => 
            log.nodeId === node.id && 
            log.message.includes('LLMに送信するプロンプト') && 
            log.data && log.data.prompt
          );
          
          if (llmLogEntry) {
            const updatedNode = { 
              ...node, 
              data: { 
                ...node.data, 
                currentPrompt: llmLogEntry.data.prompt 
              } 
            };
            if (selectedNode && selectedNode.id === node.id) newSelectedNode = updatedNode;
            return updatedNode;
          }
        }
        
        return node;
      });
      return newNodes;
    });

    if (newSelectedNode) onSelectedNodeChange(newSelectedNode);
    setDebugLog(executionLog);
  }, [selectedNode, onSelectedNodeChange, setNodes, setDebugLog]);

  const handleRunAll = useCallback(async () => {
    if (nodes.length === 0) return alert('実行するノードがありません');

    const preprocessedNodes = preprocessNodesForExecution();
    setNodes(preprocessedNodes.map(n => ({...n})));

    const inputNodes = preprocessedNodes.filter(n => n.type === 'input');
    const inputData = Object.fromEntries(inputNodes.map(n => [n.id, n.data.value || '']));
    const exec = await nodeExecutionService.startExecution(preprocessedNodes, connections, inputData, nodeTypes);

    setExecutor(exec);
    setExecutionState({ running: true, currentNodeId: null, executedNodeIds: new Set() });
    setDebugLog([]);
    nodeExecutionService.setDebugMode(true);

    try {
      let result;
      do {
        result = await exec.next();
        if (!result.done) {
          setExecutionState(prev => ({ ...prev, currentNodeId: result.value.currentNodeId, executedNodeIds: new Set(prev.executedNodeIds).add(result.value.currentNodeId) }));
        }
      } while (!result.done);
      const finalState = result.value;
      if (finalState.status === 'completed') {
        const outputResults = {};
        const outputNodes = preprocessedNodes.filter(n => n.type === 'output');
        outputNodes.forEach(node => {
          if (nodeExecutionService.executionContext[node.id] !== undefined) {
            outputResults[node.data.label || `出力${node.id}`] = nodeExecutionService.executionContext[node.id];
          }
        });
        
        setExecutionResult({ 
          success: true, 
          variables: finalState.variables,
          outputs: outputResults
        });
      } else {
        setExecutionResult({ success: false, error: finalState.error?.message || 'Unknown error' });
      }
    } catch (error) {
      console.error("Workflow execution failed:", error);
      setExecutionResult({ success: false, error: error.message });
    } finally {
      processExecutionCompletion();
      setExecutionState({ running: false, currentNodeId: null, executedNodeIds: new Set() });
      setExecutor(null);
    }
  }, [nodes, connections, nodeTypes, preprocessNodesForExecution, setNodes, setExecutor, setExecutionState, setDebugLog, setExecutionResult, processExecutionCompletion]);

  const handleStepForward = useCallback(async () => {
    let currentExecutor = executor;
    try {
      if (!currentExecutor) {
        const preprocessedNodes = preprocessNodesForExecution();
        setNodes(preprocessedNodes.map(n => ({...n})));

        const inputNodes = preprocessedNodes.filter(n => n.type === 'input');
        const inputData = Object.fromEntries(inputNodes.map(n => [n.id, n.data.value || '']));
        currentExecutor = await nodeExecutionService.startExecution(preprocessedNodes, connections, inputData);
        setExecutor(currentExecutor);
        setExecutionState({ running: true, currentNodeId: null, executedNodeIds: new Set() });
        alert("ステップ実行を開始します。もう一度「ステップ」を押して最初のノードを実行してください。");
        return;
      }
      const result = await currentExecutor.next();
      if (result.done) {
        if (result.value.status === 'completed') {
          alert('ワークフローの実行が完了しました。');
          const outputResults = {};
          const outputNodes = nodes.filter(n => n.type === 'output');
          outputNodes.forEach(node => {
            if (nodeExecutionService.executionContext[node.id] !== undefined) {
              outputResults[node.data.label || `出力${node.id}`] = nodeExecutionService.executionContext[node.id];
            }
          });
          setExecutionResult({
            success: true,
            variables: result.value.variables,
            outputs: outputResults
          });
        } else if (result.value.status === 'error') {
          alert(`エラーが発生しました: ${result.value.error?.message}`);
          setExecutionResult({ success: false, error: result.value.error?.message });
        }
        processExecutionCompletion();
        handleResetExecution();
      } else {
        setExecutionState(prev => ({ ...prev, currentNodeId: result.value.currentNodeId, executedNodeIds: new Set(prev.executedNodeIds).add(result.value.currentNodeId) }));
      }
    } catch (error) {
      console.error("Step forward failed:", error);
      setExecutionResult({ success: false, error: error.message });
      handleResetExecution();
    }
  }, [executor, nodes, connections, preprocessNodesForExecution, setNodes, setExecutor, setExecutionState, setExecutionResult, processExecutionCompletion, handleResetExecution]);

  const handleResetExecution = useCallback(() => {
    if (executor) executor.stop();
    setExecutor(null);
    setExecutionState({ running: false, currentNodeId: null, executedNodeIds: new Set() });
    setExecutionResult(null);
    setDebugLog([]);
    
    // 出力ノードの結果もクリア
    setNodes(prev => prev.map(node => 
      node.type === 'output' 
        ? { ...node, data: { ...node.data, result: '' } }
        : node
    ));
  }, [executor, setExecutor, setExecutionState, setExecutionResult, setDebugLog, setNodes]);

  return {
    handleRunAll,
    handleStepForward,
    handleResetExecution
  };
};

export default useWorkflowExecution;