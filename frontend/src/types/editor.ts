export type EditorObjectType =
  | 'text'
  | 'highlight'
  | 'drawing'
  | 'rectangle'
  | 'ellipse'
  | 'signature'
  | 'text_replace';

export type ToolType =
  | 'select'
  | 'text'
  | 'edit_text'
  | 'highlight'
  | 'draw'
  | 'rectangle'
  | 'circle'
  | 'signature';

export interface TextLineInfo {
  id: string;
  page: number;
  bbox: [number, number, number, number];
  text: string;
  font: string;
  size: number;
  color: string;
}

export interface EditorObject {
  id: string;
  page: number;
  type: EditorObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  properties: Record<string, any>;
}

export interface PageInfo {
  page_number: number;
  width: number;
  height: number;
}

export interface PdfInfo {
  document_id: string;
  filename: string;
  page_count: number;
  file_size: number;
  pages: PageInfo[];
}

export interface UploadResponse {
  document_id: string;
  filename: string;
  page_count: number;
  file_size: number;
}

export interface ExportResponse {
  document_id: string;
  export_id: string;
  filename: string;
  download_url: string;
}

export type AppState =
  | 'empty'
  | 'uploading'
  | 'loading'
  | 'editing'
  | 'saving'
  | 'saved'
  | 'error';

export interface TextProperties {
  text: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  opacity: number;
}

export interface ShapeProperties {
  stroke: string;
  strokeWidth: number;
  fill: string;
  opacity: number;
}

export interface HighlightProperties {
  fill: string;
  opacity: number;
}

export interface DrawingProperties {
  stroke: string;
  strokeWidth: number;
  opacity: number;
}
