import React from 'react'
import { Plus, Play, Save, Download, Upload, Trash2, Square, FileUp, StepForward, RotateCcw, FilePlus, FolderOpen, Trash, Edit, History } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog.jsx'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu.jsx'

const WorkflowToolbar = ({
  currentWorkflow,
  workflows,
  isRenaming,
  setIsRenaming,
  renameInputRef,
  onNewWorkflow,
  onRenameWorkflow,
  onDeleteWorkflow,
  onLoadWorkflow,
  onImportWorkflow,
  onExportWorkflow,
  onRunAll,
  onStepForward,
  onResetExecution,
  onToggleHistory,
  showHistoryView,
  executionState,
  executor,
  executionResult,
  debugLog
}) => {
  return (
    <div className="absolute top-4 left-4 z-30 bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-2 flex items-center gap-2 border">
      {/* ワークフロー管理 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="flex gap-2">
            <FolderOpen className="h-4 w-4" />
            <span>ワークフロー</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={onNewWorkflow}>
            <FilePlus className="mr-2 h-4 w-4" />
            新規作成
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>開く</DropdownMenuLabel>
          {workflows.map(wf => (
            <DropdownMenuItem key={wf.id} onSelect={() => onLoadWorkflow(wf.id)}>
              {wf.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onImportWorkflow}>
            <Upload className="mr-2 h-4 w-4" />
            インポート
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onExportWorkflow}>
            <Download className="mr-2 h-4 w-4" />
            エクスポート
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ワークフロー名編集 */}
      {isRenaming ? (
        <Input 
          ref={renameInputRef} 
          type="text" 
          defaultValue={currentWorkflow?.name} 
          onBlur={(e) => onRenameWorkflow(e.target.value)} 
          onKeyDown={(e) => e.key === 'Enter' && onRenameWorkflow(e.target.value)} 
          className="h-8 w-48"
        />
      ) : (
        <span className="text-sm font-semibold px-2">{currentWorkflow?.name}</span>
      )}
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => setIsRenaming(true)} 
        className="h-8 w-8"
      >
        <Edit className="h-4 w-4" />
      </Button>

      {/* ワークフロー削除 */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600">
            <Trash className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。「{currentWorkflow?.name}」は完全に削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={() => onDeleteWorkflow(currentWorkflow.id)}>
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="w-px h-6 bg-gray-200 mx-2" />

      {/* 実行制御 */}
      <Button 
        onClick={onRunAll} 
        disabled={executionState.running} 
        size="sm" 
        className="gap-1.5 bg-green-500 hover:bg-green-600 text-white"
      >
        <Play className="h-4 w-4" />
        すべて実行
      </Button>
      <Button 
        onClick={onStepForward} 
        disabled={executionState.running && executor} 
        size="sm" 
        variant="outline" 
        className="gap-1.5"
      >
        <StepForward className="h-4 w-4" />
        ステップ
      </Button>
      <Button 
        onClick={onResetExecution} 
        disabled={!executionState.running && !executionResult && debugLog.length === 0} 
        size="sm" 
        variant="destructive" 
        className="gap-1.5"
      >
        <RotateCcw className="h-4 w-4" />
        リセット
      </Button>
      
      <div className="w-px h-6 bg-gray-200 mx-2" />
      
      {/* 履歴表示 */}
      <Button 
        onClick={onToggleHistory} 
        size="sm" 
        variant={showHistoryView ? "default" : "outline"} 
        className="gap-1.5"
      >
        <History className="h-4 w-4" />
        実行履歴
      </Button>
    </div>
  );
};

export default WorkflowToolbar;