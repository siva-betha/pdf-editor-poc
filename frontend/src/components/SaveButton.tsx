import React from 'react';
import { Download, Loader2, CheckCircle2 } from 'lucide-react';

interface SaveButtonProps {
  onSave: () => void;
  isSaving: boolean;
  saveSuccess: boolean;
  disabled?: boolean;
}

export const SaveButton: React.FC<SaveButtonProps> = ({
  onSave,
  isSaving,
  saveSuccess,
  disabled,
}) => {
  return (
    <div className="flex items-center gap-2">
      {saveSuccess && (
        <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-emerald-400 animate-in fade-in">
          <CheckCircle2 className="w-3.5 h-3.5" />
          PDF saved successfully.
        </span>
      )}

      <button
        type="button"
        onClick={onSave}
        disabled={isSaving || disabled}
        aria-label="Save PDF"
        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition shadow ${
          isSaving
            ? 'bg-blue-700 opacity-80 cursor-wait'
            : saveSuccess
            ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'
            : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-blue-500/25'
        } disabled:opacity-50 disabled:pointer-events-none`}
      >
        {isSaving ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Generating...</span>
          </>
        ) : saveSuccess ? (
          <>
            <Download className="w-3.5 h-3.5" />
            <span>Saved!</span>
          </>
        ) : (
          <>
            <Download className="w-3.5 h-3.5" />
            <span>Save PDF</span>
          </>
        )}
      </button>
    </div>
  );
};
