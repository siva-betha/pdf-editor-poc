import React from 'react';
import { ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { PageInfo } from '../types/editor';

interface PageNavigationProps {
  currentPage: number;
  totalPages: number;
  pages: PageInfo[];
  onPageChange: (page: number) => void;
  isOpen: boolean;
  onToggleOpen?: () => void;
}

export const PageNavigation: React.FC<PageNavigationProps> = ({
  currentPage,
  totalPages,
  pages,
  onPageChange,
  isOpen,
}) => {
  if (!isOpen) return null;

  return (
    <aside
      aria-label="Pages Navigation"
      className="w-48 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0"
    >
      {/* Top Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-white uppercase tracking-wider">
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span>Pages</span>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          {currentPage} / {totalPages}
        </span>
      </div>

      {/* Thumbnails list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {pages.map((p) => {
          const isSelected = p.page_number === currentPage;
          // Calculate aspect ratio for visual miniature
          const aspect = p.width / p.height;
          return (
            <button
              key={p.page_number}
              type="button"
              onClick={() => onPageChange(p.page_number)}
              className={`w-full flex flex-col items-center gap-1 p-2 rounded-xl border transition group ${
                isSelected
                  ? 'border-blue-500 bg-blue-500/10 shadow-sm'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-800/50'
              }`}
            >
              <div
                style={{ aspectRatio: aspect }}
                className={`w-28 rounded-md bg-white flex flex-col items-center justify-center relative shadow-sm border ${
                  isSelected ? 'ring-2 ring-blue-500 border-blue-400' : 'border-slate-300'
                }`}
              >
                <div className="w-4/5 h-1.5 bg-slate-200 rounded mb-1" />
                <div className="w-3/5 h-1 bg-slate-200 rounded mb-1" />
                <div className="w-4/5 h-1 bg-slate-200 rounded" />
                <span className="absolute bottom-1 right-1 text-[9px] font-mono text-slate-400">
                  #{p.page_number}
                </span>
              </div>
              <span
                className={`text-[11px] font-medium transition ${
                  isSelected ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-300'
                }`}
              >
                Page {p.page_number}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bottom Paging Controls */}
      <div className="p-2 border-t border-slate-800 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous Page"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="text-xs text-slate-300 font-medium">
          {currentPage} of {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next Page"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
