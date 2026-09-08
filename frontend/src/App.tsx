import React, { useState, useEffect, useCallback } from 'react';
import {
  AppState,
  EditorObject,
  PdfInfo,
  ToolType,
} from './types/editor';
import { exportPdf, getPdfFileUrl, getPdfInfo, uploadPdf } from './services/api';
import {
  createInitialHistory,
  pushHistory,
  undoHistory,
  redoHistory,
  saveToSession,
  loadFromSession,
  HistoryState,
} from './utils/editorState';
import { EmptyState } from './components/EmptyState';
import { EditorToolbar } from './components/EditorToolbar';
import { PageNavigation } from './components/PageNavigation';
import { ZoomControls } from './components/ZoomControls';
import { PropertiesPanel } from './components/PropertiesPanel';
import { SignaturePad } from './components/SignaturePad';
import { SaveButton } from './components/SaveButton';
import { PdfViewer } from './components/PdfViewer';
import { FileText, AlertTriangle } from 'lucide-react';

export const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('empty');
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [pdfInfo, setPdfInfo] = useState<PdfInfo | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Viewport & Navigation
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isPagesOpen] = useState<boolean>(true);
  const [isPropertiesOpen] = useState<boolean>(true);

  // Tools & Selection
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [selectedObject, setSelectedObject] = useState<EditorObject | null>(null);
  const [activeProperties, setActiveProperties] = useState<Record<string, any>>({
    text: 'Double click to edit',
    fontSize: 16,
    fontFamily: 'Arial',
    fill: '#000000',
    stroke: '#000000',
    strokeWidth: 2,
    opacity: 1,
  });

  // Signature Modal
  const [isSignatureOpen, setIsSignatureOpen] = useState<boolean>(false);
  const [signatureToInsert, setSignatureToInsert] = useState<string | null>(null);

  // Undo/Redo History
  const [history, setHistory] = useState<HistoryState>(createInitialHistory([]));

  // Save feedback
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Confirmation dialog for New PDF
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  // File Upload Handler
  const handleUpload = async (file: File) => {
    try {
      setAppState('uploading');
      setErrorMessage(null);

      const uploadRes = await uploadPdf(file);
      const info = await getPdfInfo(uploadRes.document_id);

      setDocumentId(uploadRes.document_id);
      setPdfInfo(info);
      setPdfUrl(getPdfFileUrl(uploadRes.document_id));
      setCurrentPage(1);

      // Restore session if available
      const savedObjects = loadFromSession(uploadRes.document_id);
      const initialObjs = savedObjects || [];
      setHistory(createInitialHistory(initialObjs));

      setAppState('editing');
    } catch (err: any) {
      console.error('Upload failed:', err);
      setErrorMessage(err.message || 'Failed to upload PDF.');
      setAppState('error');
    }
  };

  // Update objects for current page
  const handleUpdatePageObjects = useCallback(
    (page: number, pageObjects: EditorObject[]) => {
      setHistory((prev) => {
        // Keep objects from other pages, replace current page objects
        const otherPages = prev.present.filter((o) => o.page !== page);
        const nextPresent = [...otherPages, ...pageObjects];
        const nextHist = pushHistory(prev, nextPresent);
        if (documentId) saveToSession(documentId, nextPresent);
        return nextHist;
      });
    },
    [documentId]
  );

  // Delete selected object
  const handleDeleteSelected = useCallback(() => {
    if (!selectedObject) return;
    setHistory((prev) => {
      const nextPresent = prev.present.filter((o) => o.id !== selectedObject.id);
      const nextHist = pushHistory(prev, nextPresent);
      if (documentId) saveToSession(documentId, nextPresent);
      return nextHist;
    });
    setSelectedObject(null);
  }, [selectedObject, documentId]);

  // Undo & Redo Handlers
  const handleUndo = useCallback(() => {
    setHistory((prev) => {
      const nextHist = undoHistory(prev);
      if (documentId) saveToSession(documentId, nextHist.present);
      return nextHist;
    });
    setSelectedObject(null);
  }, [documentId]);

  const handleRedo = useCallback(() => {
    setHistory((prev) => {
      const nextHist = redoHistory(prev);
      if (documentId) saveToSession(documentId, nextHist.present);
      return nextHist;
    });
    setSelectedObject(null);
  }, [documentId]);

  // Update selected object properties
  const handleUpdateProperties = useCallback(
    (newProps: Record<string, any>) => {
      setActiveProperties((prev) => ({ ...prev, ...newProps }));
      if (!selectedObject) return;

      const updatedObj: EditorObject = {
        ...selectedObject,
        properties: {
          ...selectedObject.properties,
          ...newProps,
        },
      };

      setSelectedObject(updatedObj);

      setHistory((prev) => {
        const nextPresent = prev.present.map((o) =>
          o.id === updatedObj.id ? updatedObj : o
        );
        const nextHist = pushHistory(prev, nextPresent);
        if (documentId) saveToSession(documentId, nextPresent);
        return nextHist;
      });
    },
    [selectedObject, documentId]
  );

  // Save / Export PDF
  const handleSavePdf = async () => {
    if (!documentId) return;

    try {
      setIsSaving(true);
      setSaveSuccess(false);

      const res = await exportPdf(documentId, history.present);

      // Trigger automatic browser download
      const downloadLink = document.createElement('a');
      downloadLink.href = res.download_url;
      downloadLink.download = res.filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('Export error:', err);
      alert(err.message || 'Could not save the PDF.');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to empty state
  const handleConfirmReset = () => {
    setShowResetConfirm(false);
    setAppState('empty');
    setDocumentId(null);
    setPdfInfo(null);
    setPdfUrl(null);
    setSelectedObject(null);
    setHistory(createInitialHistory([]));
  };

  // Keyboard Shortcuts (Section 35)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing inside text inputs / textareas
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      if (isCtrlOrCmd && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (
        (isCtrlOrCmd && e.key.toLowerCase() === 'y') ||
        (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedObject) {
          e.preventDefault();
          handleDeleteSelected();
        }
      } else if (e.key === 'Escape') {
        setActiveTool('select');
        setSelectedObject(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleDeleteSelected, selectedObject]);

  // Sync selected object properties to panel
  useEffect(() => {
    if (selectedObject) {
      setActiveProperties((prev) => ({
        ...prev,
        ...selectedObject.properties,
      }));
    }
  }, [selectedObject]);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Top Navbar */}
      <header className="h-14 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-bold text-base tracking-tight text-white">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow shadow-blue-500/30">
              <FileText className="w-4 h-4" />
            </div>
            <span>PDF Editor</span>
          </div>

          {pdfInfo && (
            <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-800 text-xs text-slate-400">
              <span className="truncate max-w-[200px] text-slate-200 font-medium">
                {pdfInfo.filename}
              </span>
              <span>•</span>
              <span>{pdfInfo.page_count} pages</span>
            </div>
          )}
        </div>

        {appState === 'editing' && (
          <div className="flex items-center gap-3">
            <SaveButton
              onSave={handleSavePdf}
              isSaving={isSaving}
              saveSuccess={saveSuccess}
            />
          </div>
        )}
      </header>

      {/* Main Workspace */}
      {appState === 'empty' || appState === 'uploading' || appState === 'error' ? (
        <EmptyState
          onFileSelected={handleUpload}
          isLoading={appState === 'uploading'}
          error={errorMessage}
        />
      ) : (
        <div className="flex-1 flex flex-col min-h-0 relative">
          {/* Editor Action Toolbar */}
          <EditorToolbar
            activeTool={activeTool}
            onSelectTool={(tool) => {
              if (tool === 'signature') {
                setIsSignatureOpen(true);
              } else {
                setActiveTool(tool);
              }
            }}
            canUndo={history.past.length > 0}
            canRedo={history.future.length > 0}
            canDelete={!!selectedObject}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onDelete={handleDeleteSelected}
            onNewPdf={() => setShowResetConfirm(true)}
            filename={pdfInfo?.filename}
          />

          {/* Core Viewer Area */}
          <div className="flex-1 flex min-h-0 relative">
            {/* Left Thumbnails Sidebar */}
            {pdfInfo && (
              <PageNavigation
                currentPage={currentPage}
                totalPages={pdfInfo.page_count}
                pages={pdfInfo.pages}
                onPageChange={(p) => {
                  setCurrentPage(p);
                  setSelectedObject(null);
                }}
                isOpen={isPagesOpen}
              />
            )}

            {/* Central Canvas Viewer */}
            <div className="flex-1 flex flex-col min-h-0 relative">
              {pdfUrl && (
                <PdfViewer
                  documentId={documentId}
                  pdfUrl={pdfUrl}
                  currentPage={currentPage}
                  scale={scale}
                  activeTool={activeTool}
                  onToolUsed={() => setActiveTool('select')}
                  allObjects={history.present}
                  onUpdatePageObjects={handleUpdatePageObjects}
                  selectedObjectId={selectedObject?.id ?? null}
                  onSelectObject={setSelectedObject}
                  activeProperties={activeProperties}
                  onSignatureRequested={() => setIsSignatureOpen(true)}
                  signatureDataToInsert={signatureToInsert}
                  onSignatureInserted={() => setSignatureToInsert(null)}
                />
              )}

              {/* Floating Bottom Zoom Controls */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
                <ZoomControls
                  scale={scale}
                  onZoomIn={() => setScale((s) => Math.min(2.0, Number((s + 0.25).toFixed(2))))}
                  onZoomOut={() => setScale((s) => Math.max(0.5, Number((s - 0.25).toFixed(2))))}
                  onSetScale={setScale}
                  onFitWidth={() => setScale(1.15)}
                  onFitPage={() => setScale(0.85)}
                />
              </div>
            </div>

            {/* Right Properties Panel */}
            <PropertiesPanel
              selectedType={selectedObject?.type ?? null}
              properties={activeProperties}
              onUpdateProperties={handleUpdateProperties}
              onDeleteSelected={handleDeleteSelected}
              isOpen={isPropertiesOpen}
            />
          </div>
        </div>
      )}

      {/* Signature Modal */}
      <SignaturePad
        isOpen={isSignatureOpen}
        onClose={() => setIsSignatureOpen(false)}
        onSave={(dataUrl) => {
          setSignatureToInsert(dataUrl);
          setIsSignatureOpen(false);
        }}
      />

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-dialog-title"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6" />
              <h2 id="reset-dialog-title" className="text-base font-semibold text-white">
                New PDF
              </h2>
            </div>
            <p className="text-xs text-slate-300">
              Are you sure? Your current editing session and unsaved annotations will be cleared.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 transition shadow"
              >
                Start Over
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
