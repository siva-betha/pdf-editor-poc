import json
import logging
import re
import time
import uuid
from pathlib import Path
from typing import Optional, Tuple
import pymupdf

from app import config
from app.models import PageInfo, PdfInfoResponse, TextLineInfo

logger = logging.getLogger(__name__)


def sanitize_filename(filename: str) -> str:
    """Sanitize original filename to prevent path traversal or special character issues."""
    name = Path(filename).name
    name = re.sub(r'[^a-zA-Z0-9_\-\. ]', '_', name)
    if not name.lower().endswith(".pdf"):
        name += ".pdf"
    return name


def validate_pdf_content(content: bytes) -> None:
    """Validate that content is a legitimate non-empty PDF file."""
    max_bytes = config.MAX_FILE_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise ValueError(f"PDF exceeds the maximum allowed file size of {config.MAX_FILE_SIZE_MB}MB.")

    if not content.startswith(b"%PDF-"):
        raise ValueError("Only PDF files are supported.")

    try:
        doc = pymupdf.open(stream=content, filetype="pdf")
        page_count = len(doc)
        if page_count == 0:
            doc.close()
            raise ValueError("The PDF has no pages.")
        if page_count > config.MAX_PAGES:
            doc.close()
            raise ValueError(f"PDF exceeds the maximum allowed page count of {config.MAX_PAGES} pages.")
        doc.close()
    except Exception as exc:
        if isinstance(exc, ValueError):
            raise
        logger.warning("Failed to parse PDF with PyMuPDF: %s", exc)
        raise ValueError("The PDF could not be opened.") from exc


def cleanup_expired_files() -> None:
    """Clean up uploads and exports older than retention window."""
    cutoff = time.time() - (config.FILE_RETENTION_MINUTES * 60)
    for directory in [config.UPLOAD_DIR_PATH, config.EXPORT_DIR_PATH]:
        if not directory.exists():
            continue
        for file_path in directory.glob("*"):
            if file_path.name == ".gitkeep":
                continue
            try:
                if file_path.stat().st_mtime < cutoff:
                    if file_path.is_file():
                        file_path.unlink()
            except Exception as exc:
                logger.warning("Could not delete expired file %s: %s", file_path, exc)


def save_uploaded_pdf(content: bytes, raw_filename: str) -> Tuple[str, str, int, int]:
    """
    Validates, saves the uploaded PDF and its metadata.
    Returns: (document_id, sanitized_filename, page_count, file_size)
    """
    cleanup_expired_files()
    validate_pdf_content(content)

    doc_id = uuid.uuid4().hex[:12]
    clean_name = sanitize_filename(raw_filename)
    dest_path = config.UPLOAD_DIR_PATH / f"{doc_id}.pdf"
    meta_path = config.UPLOAD_DIR_PATH / f"{doc_id}.json"

    dest_path.write_bytes(content)

    doc = pymupdf.open(dest_path)
    page_count = len(doc)
    doc.close()

    metadata = {
        "document_id": doc_id,
        "filename": clean_name,
        "page_count": page_count,
        "file_size": len(content),
        "uploaded_at": time.time(),
    }
    meta_path.write_text(json.dumps(metadata), encoding="utf-8")

    return doc_id, clean_name, page_count, len(content)


def get_document_pdf_path(document_id: str) -> Optional[Path]:
    """Returns the path to the uploaded PDF if valid and existing."""
    if not re.match(r"^[a-zA-Z0-9_-]{1,64}$", document_id):
        return None
    pdf_path = (config.UPLOAD_DIR_PATH / f"{document_id}.pdf").resolve()
    if pdf_path.is_relative_to(config.UPLOAD_DIR_PATH) and pdf_path.exists():
        return pdf_path
    return None


def get_document_metadata(document_id: str) -> Optional[dict]:
    """Loads stored document metadata."""
    if not re.match(r"^[a-zA-Z0-9_-]{1,64}$", document_id):
        return None
    meta_path = (config.UPLOAD_DIR_PATH / f"{document_id}.json").resolve()
    if meta_path.is_relative_to(config.UPLOAD_DIR_PATH) and meta_path.exists():
        try:
            return json.loads(meta_path.read_text(encoding="utf-8"))
        except Exception:
            return None
    return None


def get_pdf_info(document_id: str) -> PdfInfoResponse:
    """Inspects the PDF and returns its detailed page information."""
    pdf_path = get_document_pdf_path(document_id)
    if not pdf_path:
        raise FileNotFoundError(f"Document {document_id} not found.")

    metadata = get_document_metadata(document_id) or {}
    filename = metadata.get("filename", f"{document_id}.pdf")

    try:
        doc = pymupdf.open(pdf_path)
        pages = []
        for i, page in enumerate(doc):
            rect = page.rect
            pages.append(
                PageInfo(
                    page_number=i + 1,
                    width=round(rect.width, 2),
                    height=round(rect.height, 2),
                )
            )
        page_count = len(doc)
        file_size = pdf_path.stat().st_size
        doc.close()

        return PdfInfoResponse(
            document_id=document_id,
            filename=filename,
            page_count=page_count,
            file_size=file_size,
            pages=pages,
        )
    except Exception as exc:
        logger.exception("Failed to get PDF info for %s", document_id)
        raise ValueError("The PDF could not be opened.") from exc


def extract_page_text_lines(document_id: str, page_number: int) -> list[TextLineInfo]:
    """Extracts existing text lines with bounding boxes and font metadata for a specific page."""
    pdf_path = get_document_pdf_path(document_id)
    if not pdf_path:
        raise FileNotFoundError(f"Document {document_id} not found.")

    try:
        doc = pymupdf.open(pdf_path)
        if page_number < 1 or page_number > len(doc):
            doc.close()
            raise ValueError(f"Page {page_number} is out of bounds.")

        page = doc[page_number - 1]
        page_dict = page.get_text("dict")
        doc.close()

        results: list[TextLineInfo] = []
        line_counter = 0

        for block in page_dict.get("blocks", []):
            if block.get("type") != 0:  # 0 is text block
                continue
            for line in block.get("lines", []):
                spans = line.get("spans", [])
                if not spans:
                    continue

                full_text = "".join(s.get("text", "") for s in spans).strip()
                if not full_text:
                    continue

                line_counter += 1
                first_span = spans[0]
                font_name = first_span.get("font", "helv")
                font_size = round(first_span.get("size", 12.0), 2)
                raw_color = first_span.get("color", 0)
                color_hex = f"#{raw_color:06x}"

                bbox = [round(v, 2) for v in line.get("bbox", [0, 0, 0, 0])]

                results.append(
                    TextLineInfo(
                        id=f"line-{page_number}-{line_counter}",
                        page=page_number,
                        bbox=bbox,
                        text=full_text,
                        font=font_name,
                        size=font_size,
                        color=color_hex,
                    )
                )

        return results
    except Exception as exc:
        if isinstance(exc, (FileNotFoundError, ValueError)):
            raise
        logger.exception("Failed to extract text lines for document %s, page %d", document_id, page_number)
        raise RuntimeError("Failed to extract text from page.") from exc

