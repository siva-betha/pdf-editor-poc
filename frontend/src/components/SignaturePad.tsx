import React, { useRef, useState, useEffect } from 'react';
import { X, RotateCcw, Check, PenTool, Type, Palette } from 'lucide-react';

interface SignaturePadProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [tab, setTab] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState('John Doe');
  const [inkColor, setInkColor] = useState('#1e3a8a'); // Classic Navy Blue
  const [fontChoice, setFontChoice] = useState<'Caveat' | 'Georgia' | 'cursive'>('Caveat');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  // Initialize and clear canvas when dialog opens or ink changes
  useEffect(() => {
    if (!isOpen || tab !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high-DPI scaling
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 2.5;

    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasContent(false);
  }, [isOpen, tab, inkColor]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.strokeStyle = inkColor;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasContent(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasContent(false);
  };

  const handleSave = () => {
    if (tab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas || !hasContent) return;
      const dataUrl = canvas.toDataURL('image/png');
      onSave(dataUrl);
      onClose();
    } else {
      // Generate image from typed text on a virtual canvas
      if (!typedName.trim()) return;
      const offscreen = document.createElement('canvas');
      offscreen.width = 500;
      offscreen.height = 160;
      const ctx = offscreen.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, 500, 160);
      ctx.fillStyle = inkColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (fontChoice === 'Caveat') {
        ctx.font = '700 48px "Caveat", cursive';
      } else if (fontChoice === 'Georgia') {
        ctx.font = 'italic 38px Georgia, serif';
      } else {
        ctx.font = 'italic 40px "Brush Script MT", cursive, sans-serif';
      }

      ctx.fillText(typedName, 250, 80);
      const dataUrl = offscreen.toDataURL('image/png');
      onSave(dataUrl);
      onClose();
    }
  };

  const inkColors = [
    { label: 'Navy Blue', hex: '#1e3a8a' },
    { label: 'Classic Black', hex: '#0f172a' },
    { label: 'Royal Blue', hex: '#2563eb' },
    { label: 'Burgundy', hex: '#881337' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signature-dialog-title"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-white font-semibold">
            <PenTool className="w-5 h-5 text-blue-400" />
            <h2 id="signature-dialog-title" className="text-base font-semibold">
              Create Signature
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close signature dialog"
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector & Ink Color Bar */}
        <div className="flex items-center justify-between px-6 pt-4 pb-2">
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700">
            <button
              type="button"
              onClick={() => setTab('draw')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition ${
                tab === 'draw'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              Draw
            </button>
            <button
              type="button"
              onClick={() => setTab('type')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition ${
                tab === 'type'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              Type
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-slate-400 mr-1" />
            {inkColors.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => setInkColor(c.hex)}
                title={c.label}
                aria-label={c.label}
                className={`w-6 h-6 rounded-full border-2 transition ${
                  inkColor === c.hex ? 'border-white scale-110 shadow-sm' : 'border-slate-700 hover:scale-105'
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 pt-2 space-y-4">
          {tab === 'draw' ? (
            <div>
              <p className="text-xs text-slate-400 mb-2">
                Draw your signature below with mouse, trackpad, or finger.
              </p>
              <div className="relative rounded-xl border border-dashed border-slate-600 bg-white shadow-inner overflow-hidden">
                <canvas
                  ref={canvasRef}
                  className="w-full h-44 cursor-crosshair touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                {!hasContent && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-400 text-sm font-light select-none">
                    Sign Here
                  </div>
                )}
                <div className="absolute bottom-6 left-6 right-6 border-b border-slate-200 pointer-events-none" />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Enter Your Name</label>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Select Font Style</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFontChoice('Caveat')}
                    className={`p-2 rounded-lg border text-center transition ${
                      fontChoice === 'Caveat'
                        ? 'border-blue-500 bg-blue-500/10 text-white'
                        : 'border-slate-800 bg-slate-800/60 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xl font-bold font-['Caveat'] block">Style 1</span>
                    <span className="text-[10px] opacity-70">Handwriting</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFontChoice('Georgia')}
                    className={`p-2 rounded-lg border text-center transition ${
                      fontChoice === 'Georgia'
                        ? 'border-blue-500 bg-blue-500/10 text-white'
                        : 'border-slate-800 bg-slate-800/60 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-base italic font-serif block">Style 2</span>
                    <span className="text-[10px] opacity-70">Formal Serif</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFontChoice('cursive')}
                    className={`p-2 rounded-lg border text-center transition ${
                      fontChoice === 'cursive'
                        ? 'border-blue-500 bg-blue-500/10 text-white'
                        : 'border-slate-800 bg-slate-800/60 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-base italic font-['Brush_Script_MT'] block">Style 3</span>
                    <span className="text-[10px] opacity-70">Calligraphy</span>
                  </button>
                </div>
              </div>

              {/* Preview Box */}
              <div className="p-4 rounded-xl border border-slate-700 bg-white flex items-center justify-center min-h-[90px] shadow-inner">
                <span
                  style={{
                    color: inkColor,
                    fontFamily:
                      fontChoice === 'Caveat'
                        ? '"Caveat", cursive'
                        : fontChoice === 'Georgia'
                        ? 'Georgia, serif'
                        : '"Brush Script MT", cursive',
                    fontSize: fontChoice === 'Caveat' ? '38px' : '30px',
                    fontStyle: fontChoice === 'Caveat' ? 'normal' : 'italic',
                    fontWeight: fontChoice === 'Caveat' ? '700' : 'normal',
                  }}
                  className="select-none truncate max-w-full"
                >
                  {typedName || 'Signature Preview'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900/60 border-t border-slate-800">
          {tab === 'draw' ? (
            <button
              type="button"
              onClick={handleClear}
              disabled={!hasContent}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={tab === 'draw' ? !hasContent : !typedName.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none transition shadow"
            >
              <Check className="w-3.5 h-3.5" />
              Add Signature
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
