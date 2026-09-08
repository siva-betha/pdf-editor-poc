import React from 'react';
import { ZoomIn, ZoomOut, Maximize2, MoveHorizontal } from 'lucide-react';

interface ZoomControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSetScale: (scale: number) => void;
  onFitWidth: () => void;
  onFitPage: () => void;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  scale,
  onZoomIn,
  onZoomOut,
  onSetScale,
  onFitWidth,
  onFitPage,
}) => {
  const percentage = Math.round(scale * 100);

  return (
    <nav
      aria-label="Zoom controls"
      className="flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 rounded-xl px-2 py-1 shadow-lg backdrop-blur-sm text-slate-300 text-xs"
    >
      <button
        type="button"
        onClick={onZoomOut}
        disabled={scale <= 0.5}
        title="Zoom Out"
        aria-label="Zoom Out"
        className="p-1 rounded-md hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
      >
        <ZoomOut className="w-3.5 h-3.5" />
      </button>

      {/* Direct scale select */}
      <select
        value={percentage}
        onChange={(e) => onSetScale(Number(e.target.value) / 100)}
        aria-label="Zoom Level"
        className="bg-transparent text-white font-medium text-xs px-1 py-0.5 rounded focus:outline-none cursor-pointer"
      >
        <option value={50} className="bg-slate-900">50%</option>
        <option value={75} className="bg-slate-900">75%</option>
        <option value={100} className="bg-slate-900">100%</option>
        <option value={125} className="bg-slate-900">125%</option>
        <option value={150} className="bg-slate-900">150%</option>
        <option value={200} className="bg-slate-900">200%</option>
      </select>

      <button
        type="button"
        onClick={onZoomIn}
        disabled={scale >= 2.0}
        title="Zoom In"
        aria-label="Zoom In"
        className="p-1 rounded-md hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
      >
        <ZoomIn className="w-3.5 h-3.5" />
      </button>

      <div className="h-4 w-px bg-slate-700 mx-1" />

      <button
        type="button"
        onClick={onFitWidth}
        title="Fit to Width"
        aria-label="Fit to Width"
        className="flex items-center gap-1 px-2 py-1 rounded-md hover:text-white hover:bg-slate-800 transition text-[11px]"
      >
        <MoveHorizontal className="w-3 h-3" />
        <span>Fit Width</span>
      </button>

      <button
        type="button"
        onClick={onFitPage}
        title="Fit to Page"
        aria-label="Fit to Page"
        className="flex items-center gap-1 px-2 py-1 rounded-md hover:text-white hover:bg-slate-800 transition text-[11px]"
      >
        <Maximize2 className="w-3 h-3" />
        <span>Fit Page</span>
      </button>
    </nav>
  );
};
