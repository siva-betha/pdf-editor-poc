import React, { useRef, useState } from 'react';
import { FileUp, FileText, AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
  error?: string | null;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onFileSelected,
  isLoading,
  error,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndHandle = (files: FileList | null) => {
    setLocalError(null);
    if (!files || files.length === 0) return;

    if (files.length > 1) {
      setLocalError('Only one PDF can be edited at a time.');
      return;
    }

    const file = files[0];
    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      setLocalError('Invalid file type. Only PDF files are supported.');
      return;
    }

    onFileSelected(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isLoading) return;
    validateAndHandle(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isLoading) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-100">
      <div className="w-full max-w-xl text-center space-y-6">
        <header className="space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-2 shadow-inner">
            <FileText className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            PDF Editor
          </h1>
          <p className="text-slate-400 text-sm sm:text-base">
            Edit, annotate, highlight, and save PDFs directly in your browser.
          </p>
        </header>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !isLoading && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-10 sm:p-12 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-4 ${
            isDragOver
              ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
              : 'border-slate-700 hover:border-slate-500 bg-slate-900/60 hover:bg-slate-900/90'
          } ${isLoading ? 'opacity-70 pointer-events-none' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => validateAndHandle(e.target.files)}
          />

          <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 shadow">
            <FileUp className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <p className="text-base font-semibold text-slate-200">
              {isLoading ? 'Processing document...' : 'Drag & Drop PDF here'}
            </p>
            <p className="text-xs text-slate-400">or click to browse from your computer</p>
          </div>

          <button
            type="button"
            disabled={isLoading}
            className="mt-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-medium transition shadow hover:shadow-blue-500/25"
          >
            Upload PDF
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 pt-1">
          <span className="text-xs text-slate-500">Don't have a PDF ready?</span>
          <button
            type="button"
            onClick={async (e) => {
              e.stopPropagation();
              try {
                const res = await fetch('/sample_doc.pdf');
                const blob = await res.blob();
                const file = new File([blob], 'sample_contract.pdf', { type: 'application/pdf' });
                onFileSelected(file);
              } catch (err) {
                console.error('Failed to load sample doc:', err);
              }
            }}
            disabled={isLoading}
            id="try-sample-doc-btn"
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 underline underline-offset-4 decoration-blue-500/40 hover:decoration-blue-400 transition cursor-pointer"
          >
            Try Sample Contract
          </button>
        </div>

        {(localError || error) && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm justify-center">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{localError || error}</span>
          </div>
        )}

        <p className="text-xs text-slate-500">
          Only one PDF can be edited at a time. Maximum file size: 50MB.
        </p>
      </div>
    </main>
  );
};
