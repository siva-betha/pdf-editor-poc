# PDF Editor POC

A modern, full-stack Proof of Concept web application for viewing, annotating, and editing PDF documents in the browser with non-destructive overlay exports powered by PyMuPDF.

---

## Features

- **In-Place Existing PDF Text Editing**: Click "Edit PDF Text" to detect existing lines on any PDF page. Click any line to edit it in place; the backend redacts the original text bounding box and applies your updated text seamlessly during export.
- **Sample Document Tester**: One-click "Try Sample Contract" button to immediately test the editor and in-place text replacement.
- **Single PDF Upload**: Drag-and-drop or browse PDF documents with client and server-side validation.
- **PDF Browser Rendering**: High-fidelity, client-side PDF page rendering powered by PDF.js.
- **Multi-Page Navigation**: Visual page thumbnail sidebar with instant navigation, page counter, and previous/next controls.
- **Dynamic Zoom**: 50% to 200% zoom scaling with **Fit Width** and **Fit Page** presets.
- **Interactive Annotation & Overlay Tools**:
  - **Edit PDF Text**: In-place replacement of existing document text with vector redactions.
  - **Text**: Add editable text objects with custom font family (Arial, Times New Roman, Courier New), font size, color, bold, italic, and underline styling.
  - **Highlight**: Semi-transparent rectangular highlights with customizable opacity and color presets.
  - **Freehand Drawing**: Smooth freehand drawing with mouse, trackpad, or stylus.
  - **Shapes**: Vector rectangles and circles/ellipses with border color, stroke width, fill color, and transparency options.
  - **Signature**: Visual signature pad modal for drawing signatures and placing them as scalable overlays.
- **Object Manipulation**: Select, drag, resize, and rotate annotations on canvas.
- **Properties Inspector**: Real-time contextual sidebar for modifying properties of selected elements.
- **Undo / Redo History**: Complete undo/redo stack with keyboard shortcuts (`Ctrl+Z`, `Ctrl+Y`, `Cmd+Z`, `Cmd+Shift+Z`).
- **Deletion & Shortcuts**: Delete selected annotations via toolbar button or `Delete`/`Backspace` key.
- **Non-Destructive PDF Export**: Backend merges annotations and applies physical redactions onto original pages without rasterizing original vector graphics and layouts.
- **Direct Download**: One-click "Save PDF" automatically exports and initiates browser download.
- **Docker Support**: Containerized setup with Docker Compose.

---

## Architecture

```text
Original PDF
     │
     ▼
PDF.js Renderer
     │
     ├──────────────────────┐
     │                      │
     ▼                      ▼
PDF Page Canvas        Fabric.js Overlay Canvas
                            │
                            ├── Text
                            ├── Highlight
                            ├── Freehand Drawing
                            ├── Rectangle
                            ├── Ellipse
                            └── Signature
     │
     ▼
Editor State JSON (PDF Page Coordinates)
     │
     ▼
FastAPI Backend
     │
     ▼
PyMuPDF (`fitz`) Overlay Engine
     │
     ▼
New Edited PDF Download
```

---

## Requirements

### Local Development
- **Python**: 3.11+ (Python 3.11, 3.12, 3.13, or 3.14)
- **Node.js**: 20+ (with npm)

### Docker Environment
- **Docker** 24+
- **Docker Compose** v2+

---

## Quick Start (Docker)

To run the entire application using Docker Compose:

```bash
docker compose up --build
```

Access the services:
- **Frontend Editor**: [http://localhost:5173](http://localhost:5173)
- **Backend API Docs (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

## Local Development Setup

### 1. Backend Setup

```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend will start at `http://localhost:8000`.

### 2. Frontend Setup

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend will start at `http://localhost:5173`.

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Service health status |
| `POST` | `/api/pdf/upload` | Upload a PDF document (multipart form) |
| `GET` | `/api/pdf/{document_id}/info` | Retrieve document metadata & page dimensions |
| `GET` | `/api/pdf/{document_id}/file` | Fetch original uploaded PDF binary |
| `POST` | `/api/pdf/{document_id}/export` | Export PDF with applied overlays |
| `GET` | `/api/pdf/export/{export_id}/download` | Download the exported PDF file |

---

## Testing

### Backend Unit Tests

Run the comprehensive pytest test suite:

```bash
pytest -v tests/
```

Tests cover:
- Health check verification
- File validation (rejecting non-PDFs, fake MIME types, corrupt data)
- File size and page limit validation
- Document metadata inspection
- Non-destructive PyMuPDF overlays (text, highlights, shapes, drawings, signatures)
- Unknown document/export handling (404 errors)
- Path traversal protection

### Frontend Verification

Build the production bundle:

```bash
cd frontend
npm run build
```

---

## Security & Retention

- **File Retention**: Automatically cleans up uploads and exports older than `FILE_RETENTION_MINUTES` (default 30 mins).
- **Path Traversal Protection**: Randomly generated UUIDs for uploads and exports; original filenames are sanitized and never exposed as disk paths.
- **Configurable Limits**: Maximum file size (`MAX_FILE_SIZE_MB=50`) and maximum pages (`MAX_PAGES=100`).
