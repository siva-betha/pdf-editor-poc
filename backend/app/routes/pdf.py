import logging
from typing import List
from fastapi import APIRouter, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from app.models import PdfInfoResponse, TextLineInfo, UploadResponse
from app.services.pdf_service import (
    extract_page_text_lines,
    get_document_pdf_path,
    get_pdf_info,
    save_uploaded_pdf,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/pdf", tags=["pdf"])


@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_pdf(file: UploadFile = File(...)):
    """Upload a single PDF document for editing."""
    filename = file.filename or "document.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported.",
        )

    content_type = (file.content_type or "").lower()
    if content_type and content_type not in ("application/pdf", "application/x-pdf", "application/octet-stream"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported.",
        )

    try:
        content = await file.read()
    except Exception as exc:
        logger.error("Error reading uploaded file: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not read uploaded file.",
        )

    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    try:
        doc_id, clean_name, page_count, file_size = save_uploaded_pdf(content, filename)
        return UploadResponse(
            document_id=doc_id,
            filename=clean_name,
            page_count=page_count,
            file_size=file_size,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except Exception as exc:
        logger.exception("Unexpected error in PDF upload: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="PDF upload failed.",
        )


@router.get("/{document_id}/info", response_model=PdfInfoResponse)
async def get_info(document_id: str):
    """Retrieve metadata and page dimensions for an uploaded PDF."""
    try:
        return get_pdf_info(document_id)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except Exception as exc:
        logger.exception("Failed to fetch info for document %s: %s", document_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The PDF could not be opened.",
        )


@router.get("/{document_id}/file")
async def get_raw_pdf(document_id: str):
    """Serve the raw uploaded PDF binary for rendering."""
    pdf_path = get_document_pdf_path(document_id)
    if not pdf_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )
    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=pdf_path.name,
    )


@router.get("/{document_id}/pages/{page}/text", response_model=List[TextLineInfo])
async def get_page_text(document_id: str, page: int):
    """Retrieve extracted text lines with bounding boxes for in-place editing."""
    try:
        return extract_page_text_lines(document_id, page)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except Exception as exc:
        logger.exception("Failed to extract page text for %s: %s", document_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to extract page text.",
        )

