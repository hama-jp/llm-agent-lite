import { useCallback } from 'react'
import nodeExecutionService from '../services/nodeExecutionService.js'
import useReactFlowStore from '../store/reactFlowStore.js'

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
      console.log('processExecutionCompletion - prevNodes:', prevNodes);
      const validNodes = Array.isArray(prevNodes) ? prevNodes : [];
      const newNodes = validNodes.map(node => {
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

  const convertConnectionsFormat = useCallback(() => {
    // React FlowのエッジデータをnodeExecutionServiceが期待する形式に変換
    return connections.map(edge => ({
      from: {
        nodeId: edge.source,
        portIndex: parseInt(edge.sourceHandle) || 0
      },
      to: {
        nodeId: edge.target,
        portIndex: parseInt(edge.targetHandle) || 0,
        name: edge.targetHandle
      }
    }));
  }, [connections]);

  const handleRunAll = useCallback(async () => {
    console.log('実行開始 - 現在のnodes:', nodes);
    if (nodes.length === 0) return alert('実行するノードがありません');

    const preprocessedNodes = preprocessNodesForExecution();
    console.log('preprocessedNodes:', preprocessedNodes);
    
    // 実行前のノード状態をクリアしない（ノードを保持）
    // setNodes(prevNodes => {
    //   const validNodes = Array.isArray(prevNodes) ? prevNodes : [];
    //   return preprocessedNodes.length > 0 ? preprocessedNodes.map(n => ({...n})) : validNodes;
    // });
    console.log('実行前 - ノード状態を保持します');

    const inputNodes = preprocessedNodes.filter(n => n.type === 'input');
    const inputData = Object.fromEntries(inputNodes.map(n => [n.id, n.data.value || '']));
    const convertedConnections = convertConnectionsFormat();
    const exec = await nodeExecutionService.startExecution(preprocessedNodes, convertedConnections, inputData, nodeTypes);

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
        console.log('実行完了 - finalState:', finalState);
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
        
        // Outputノードの結果を更新しない（ノードが消えるのを防ぐ）
        // 実行結果はoutputResultsで確認できる
        outputNodes.forEach(node => {
          if (nodeExecutionService.executionContext[node.id] !== undefined) {
            console.log(`Outputノード ${node.id} の結果:`, nodeExecutionService.executionContext[node.id]);
          }
        });
      } else {
        console.log('実行失敗:', finalState.error);
        setExecutionResult({ success: false, error: finalState.error?.message || 'Unknown error' });
      }
    } catch (error) {
      console.error("Workflow execution failed:", error);
      setExecutionResult({ success: false, error: error.message });
    } finally {
      // processExecutionCompletion();
      console.log('実行完了 - ノード状態をリセットしません');
      setExecutionState({ running: false, currentNodeId: null, executedNodeIds: new Set() });
      setExecutor(null);
    }
  }, [nodes, connections, nodeTypes, preprocessNodesForExecution, setNodes, setExecutor, setExecutionState, setDebugLog, setExecutionResult, processExecutionCompletion, convertConnectionsFormat]);

  const handleStepForward = useCallback(async () => {
    let currentExecutor = executor;
    try {
      if (!currentExecutor) {
        const preprocessedNodes = preprocessNodesForExecution();
        setNodes(preprocessedNodes.map(n => ({...n})));

        const inputNodes = preprocessedNodes.filter(n => n.type === 'input');
        const inputData = Object.fromEntries(inputNodes.map(n => [n.id, n.data.value || '']));
        const convertedConnections = convertConnectionsFormat();
        currentExecutor = await nodeExecutionService.startExecution(preprocessedNodes, convertedConnections, inputData);
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
        // Process execution completion directly to avoid circular dependency
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

        // Reset execution directly to avoid circular dependency
        if (executor) executor.stop();
        setExecutor(null);
        setExecutionState({ running: false, currentNodeId: null, executedNodeIds: new Set() });
        setExecutionResult(null);
        
        // Clear output node results
        setNodes(prev => prev.map(node => 
          node.type === 'output' 
            ? { ...node, data: { ...node.data, result: '' } }
            : node
        ));
      } else {
        setExecutionState(prev => ({ ...prev, currentNodeId: result.value.currentNodeId, executedNodeIds: new Set(prev.executedNodeIds).add(result.value.currentNodeId) }));
      }
    } catch (error) {
      console.error("Step forward failed:", error);
      setExecutionResult({ success: false, error: error.message });
      // Reset execution directly to avoid circular dependency
      if (executor) executor.stop();
      setExecutor(null);
      setExecutionState({ running: false, currentNodeId: null, executedNodeIds: new Set() });
      setExecutionResult({ success: false, error: error.message });
      setDebugLog([]);
    }
  }, [executor, nodes, connections, preprocessNodesForExecution, setNodes, setExecutor, setExecutionState, setExecutionResult, selectedNode, onSelectedNodeChange, setDebugLog, convertConnectionsFormat]);

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