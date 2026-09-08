import React from 'react';
import {
  MousePointer,
  Type,
  FileEdit,
  Highlighter,
  Pencil,
  Square,
  Circle,
  PenTool,
  Undo2,
  Redo2,
  Trash2,
  FilePlus2,
} from 'lucide-react';
import { ToolType } from '../types/editor';

interface EditorToolbarProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  canUndo: boolean;
  canRedo: boolean;
  canDelete: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  onNewPdf: () => void;
  filename?: string;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  activeTool,
  onSelectTool,
  canUndo,
  canRedo,
  canDelete,
  onUndo,
  onRedo,
  onDelete,
  onNewPdf,
}) => {
  const tools: { id: ToolType; label: string; icon: React.ReactNode; shortcut?: string; badge?: string }[] = [
    { id: 'select', label: 'Select', icon: <MousePointer className="w-4 h-4" />, shortcut: 'Esc' },
    { id: 'edit_text', label: 'Edit PDF Text', icon: <FileEdit className="w-4 h-4 text-emerald-400" />, badge: 'Live' },
    { id: 'text', label: 'Add Text', icon: <Type className="w-4 h-4" /> },
    { id: 'highlight', label: 'Highlight', icon: <Highlighter className="w-4 h-4" /> },
    { id: 'draw', label: 'Draw', icon: <Pencil className="w-4 h-4" /> },
    { id: 'rectangle', label: 'Rectangle', icon: <Square className="w-4 h-4" /> },
    { id: 'circle', label: 'Circle', icon: <Circle className="w-4 h-4" /> },
    { id: 'signature', label: 'Signature', icon: <PenTool className="w-4 h-4" /> },
  ];

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 text-slate-200">
      {/* Tool buttons */}
      <div className="flex items-center gap-1 overflow-x-auto py-0.5">
        {tools.map((tool) => {
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => onSelectTool(tool.id)}
              title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
              aria-label={tool.label}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tool.icon}
              <span className="hidden sm:inline">{tool.label}</span>
              {tool.badge && (
                <span className="hidden md:inline-block text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-semibold uppercase tracking-wider">
                  {tool.badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="h-5 w-px bg-slate-800 mx-1" />

        {/* History actions */}
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          aria-label="Undo action"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
        >
          <Undo2 className="w-4 h-4" />
          <span className="hidden md:inline">Undo</span>
        </button>

        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          aria-label="Redo action"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
        >
          <Redo2 className="w-4 h-4" />
          <span className="hidden md:inline">Redo</span>
        </button>

        <div className="h-5 w-px bg-slate-800 mx-1" />

        {/* Delete button */}
        <button
          type="button"
          onClick={onDelete}
          disabled={!canDelete}
          title="Delete selected (Delete / Backspace)"
          aria-label="Delete selected object"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 disabled:opacity-30 disabled:pointer-events-none transition"
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden md:inline">Delete</span>
        </button>
      </div>

      {/* New PDF action */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onNewPdf}
          title="Open a different PDF"
          aria-label="New PDF"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
        >
          <FilePlus2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New PDF</span>
        </button>
      </div>
    </div>
  );
};
