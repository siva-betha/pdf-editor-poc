import React from 'react';
import { Bold, Italic, Underline, Trash2, Sliders } from 'lucide-react';
import { EditorObjectType } from '../types/editor';

interface PropertiesPanelProps {
  selectedType: EditorObjectType | null;
  properties: Record<string, any>;
  onUpdateProperties: (newProps: Record<string, any>) => void;
  onDeleteSelected: () => void;
  isOpen: boolean;
  onToggleOpen?: () => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedType,
  properties,
  onUpdateProperties,
  onDeleteSelected,
  isOpen,
}) => {
  if (!isOpen) return null;

  if (!selectedType) {
    return (
      <aside
        aria-label="Object Properties"
        className="w-64 bg-slate-900/95 border-l border-slate-800 p-4 flex flex-col justify-center items-center text-center text-slate-500"
      >
        <Sliders className="w-8 h-8 mb-2 opacity-40 text-slate-400" />
        <p className="text-xs font-medium text-slate-400">No element selected</p>
        <p className="text-[11px] text-slate-500 mt-1 max-w-[180px]">
          Click on any annotation on the page to customize its properties.
        </p>
      </aside>
    );
  }

  const handlePropChange = (key: string, value: any) => {
    onUpdateProperties({ [key]: value });
  };

  return (
    <aside
      aria-label="Object Properties"
      className="w-64 bg-slate-900 border-l border-slate-800 p-4 flex flex-col justify-between overflow-y-auto text-slate-200 text-xs"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <span className="font-semibold text-white uppercase tracking-wider text-[11px]">
            {selectedType} Properties
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono">
            {selectedType}
          </span>
        </div>

        {/* Text Properties */}
        {(selectedType === 'text' || selectedType === 'text_replace') && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Text Content</label>
              <textarea
                rows={2}
                value={properties.text || ''}
                onChange={(e) => handlePropChange('text', e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-blue-500 resize-none text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Font Family</label>
              <select
                value={properties.fontFamily || 'Arial'}
                onChange={(e) => handlePropChange('fontFamily', e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-blue-500 text-xs"
              >
                <option value="Arial">Arial (Sans-Serif)</option>
                <option value="Times New Roman">Times New Roman (Serif)</option>
                <option value="Courier New">Courier New (Monospace)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Font Size</label>
                <input
                  type="number"
                  min="8"
                  max="72"
                  value={properties.fontSize || 16}
                  onChange={(e) => handlePropChange('fontSize', Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={properties.fill || '#000000'}
                    onChange={(e) => handlePropChange('fill', e.target.value)}
                    className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                  />
                  <span className="font-mono text-[10px] text-slate-400">{properties.fill || '#000000'}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Formatting</label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    handlePropChange(
                      'fontWeight',
                      properties.fontWeight === 'bold' ? 'normal' : 'bold'
                    )
                  }
                  className={`p-1.5 rounded-md border ${
                    properties.fontWeight === 'bold'
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'border-slate-700 hover:bg-slate-800 text-slate-300'
                  }`}
                  title="Bold"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handlePropChange(
                      'fontStyle',
                      properties.fontStyle === 'italic' ? 'normal' : 'italic'
                    )
                  }
                  className={`p-1.5 rounded-md border ${
                    properties.fontStyle === 'italic'
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'border-slate-700 hover:bg-slate-800 text-slate-300'
                  }`}
                  title="Italic"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handlePropChange('underline', !properties.underline)
                  }
                  className={`p-1.5 rounded-md border ${
                    properties.underline
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'border-slate-700 hover:bg-slate-800 text-slate-300'
                  }`}
                  title="Underline"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Highlight Properties */}
        {selectedType === 'highlight' && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Highlight Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={properties.fill || '#ffff00'}
                  onChange={(e) => handlePropChange('fill', e.target.value)}
                  className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                />
                <span className="font-mono text-[10px] text-slate-400">{properties.fill || '#ffff00'}</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Opacity</span>
                <span>{Math.round((properties.opacity ?? 0.35) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                value={properties.opacity ?? 0.35}
                onChange={(e) => handlePropChange('opacity', Number(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>
          </div>
        )}

        {/* Shape Properties (Rectangle & Circle) */}
        {(selectedType === 'rectangle' || selectedType === 'ellipse') && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Border Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={properties.stroke || '#000000'}
                  onChange={(e) => handlePropChange('stroke', e.target.value)}
                  className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                />
                <span className="font-mono text-[10px] text-slate-400">{properties.stroke || '#000000'}</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Border Width</label>
              <input
                type="number"
                min="1"
                max="20"
                value={properties.strokeWidth || 2}
                onChange={(e) => handlePropChange('strokeWidth', Number(e.target.value))}
                className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Fill Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={properties.fill && properties.fill !== 'transparent' ? properties.fill : '#ffffff'}
                  onChange={(e) => handlePropChange('fill', e.target.value)}
                  className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => handlePropChange('fill', 'transparent')}
                  className={`px-2 py-1 rounded text-[10px] border ${
                    properties.fill === 'transparent'
                      ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                      : 'border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  Transparent
                </button>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Opacity</span>
                <span>{Math.round((properties.opacity ?? 1) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={properties.opacity ?? 1.0}
                onChange={(e) => handlePropChange('opacity', Number(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>
          </div>
        )}

        {/* Freehand Drawing Properties */}
        {selectedType === 'drawing' && (
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Stroke Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={properties.stroke || '#000000'}
                  onChange={(e) => handlePropChange('stroke', e.target.value)}
                  className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                />
                <span className="font-mono text-[10px] text-slate-400">{properties.stroke || '#000000'}</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Line Width</label>
              <input
                type="number"
                min="1"
                max="30"
                value={properties.strokeWidth || 2}
                onChange={(e) => handlePropChange('strokeWidth', Number(e.target.value))}
                className="w-full px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>
          </div>
        )}

        {/* Signature Properties */}
        {selectedType === 'signature' && (
          <div className="space-y-2">
            <p className="text-[11px] text-slate-400">
              Signature image placed. You can resize or drag it across the page.
            </p>
          </div>
        )}
      </div>

      {/* Delete element action */}
      <div className="pt-4 mt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={onDeleteSelected}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium border border-rose-500/20 transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete Element
        </button>
      </div>
    </aside>
  );
};
