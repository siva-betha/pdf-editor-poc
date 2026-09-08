import { EditorObject } from '../types/editor';

export interface HistoryState {
  past: EditorObject[][];
  present: EditorObject[];
  future: EditorObject[][];
}

export function createInitialHistory(initialObjects: EditorObject[] = []): HistoryState {
  return {
    past: [],
    present: initialObjects,
    future: [],
  };
}

export function pushHistory(state: HistoryState, nextObjects: EditorObject[]): HistoryState {
  return {
    past: [...state.past, state.present],
    present: nextObjects,
    future: [], // clear redo stack on new action
  };
}

export function undoHistory(state: HistoryState): HistoryState {
  if (state.past.length === 0) return state;
  const previous = state.past[state.past.length - 1];
  const newPast = state.past.slice(0, state.past.length - 1);
  return {
    past: newPast,
    present: previous,
    future: [state.present, ...state.future],
  };
}

export function redoHistory(state: HistoryState): HistoryState {
  if (state.future.length === 0) return state;
  const next = state.future[0];
  const newFuture = state.future.slice(1);
  return {
    past: [...state.past, state.present],
    present: next,
    future: newFuture,
  };
}

export function getObjectsForPage(objects: EditorObject[], page: number): EditorObject[] {
  return objects.filter((obj) => obj.page === page);
}

export function saveToSession(documentId: string, objects: EditorObject[]): void {
  try {
    sessionStorage.setItem(`pdf_editor_${documentId}`, JSON.stringify(objects));
  } catch {
    // ignore
  }
}

export function loadFromSession(documentId: string): EditorObject[] | null {
  try {
    const raw = sessionStorage.getItem(`pdf_editor_${documentId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return null;
}
