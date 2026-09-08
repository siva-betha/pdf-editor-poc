import logging
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse

from app.models import ExportRequest, ExportResponse
from app.services.export_service import export_edited_pdf, get_export_pdf_path

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/pdf", tags=["export"])


@router.post("/{document_id}/export", response_model=ExportResponse)
async def export_pdf_endpoint(document_id: str, request: ExportRequest):
    """Export the PDF with overlays applied and return download information."""
    try:
        return export_edited_pdf(document_id, request.objects)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )
    except Exception as exc:
        logger.exception("Export failed for document %s: %s", document_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="PDF export failed.",
        )


@router.get("/export/{export_id}/download")
async def download_exported_pdf(export_id: str):
    """Download the newly generated edited PDF."""
    result = get_export_pdf_path(export_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exported PDF not found or expired.",
        )

    file_path, filename = result
    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
