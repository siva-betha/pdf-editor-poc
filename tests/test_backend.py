import io
import sys
from pathlib import Path
import pytest
import pymupdf
from fastapi.testclient import TestClient

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BASE_DIR))

from app.main import app
from app.config import MAX_FILE_SIZE_MB, MAX_PAGES


client = TestClient(app)


def create_test_pdf(num_pages: int = 2, text: str = "Test PDF Document") -> bytes:
    """Helper to generate a clean PDF in-memory with PyMuPDF."""
    doc = pymupdf.open()
    for i in range(num_pages):
        page = doc.new_page(pno=-1, width=612, height=792)
        page.insert_text(pymupdf.Point(50, 100), f"{text} - Page {i + 1}", fontsize=14)
    buffer = io.BytesIO()
    doc.save(buffer)
    doc.close()
    return buffer.getvalue()


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_reject_non_pdf_extension():
    response = client.post(
        "/api/pdf/upload",
        files={"file": ("test.txt", b"Hello world", "text/plain")},
    )
    assert response.status_code == 400
    assert "Only PDF files are supported" in response.json()["detail"]


def test_reject_fake_pdf_mime():
    response = client.post(
        "/api/pdf/upload",
        files={"file": ("test.pdf", b"This is not a real pdf", "image/png")},
    )
    assert response.status_code == 400


def test_reject_corrupt_pdf():
    response = client.post(
        "/api/pdf/upload",
        files={"file": ("corrupt.pdf", b"%PDF-1.4 but corrupt data here", "application/pdf")},
    )
    assert response.status_code == 400


def test_successful_pdf_upload_and_info():
    pdf_bytes = create_test_pdf(num_pages=3, text="Sample Multi-page")
    upload_res = client.post(
        "/api/pdf/upload",
        files={"file": ("sample.pdf", pdf_bytes, "application/pdf")},
    )
    assert upload_res.status_code == 201
    data = upload_res.json()
    assert "document_id" in data
    assert data["filename"] == "sample.pdf"
    assert data["page_count"] == 3
    assert data["file_size"] == len(pdf_bytes)

    doc_id = data["document_id"]

    # Test Info endpoint
    info_res = client.get(f"/api/pdf/{doc_id}/info")
    assert info_res.status_code == 200
    info = info_res.json()
    assert info["document_id"] == doc_id
    assert info["page_count"] == 3
    assert len(info["pages"]) == 3
    assert info["pages"][0]["width"] == 612
    assert info["pages"][0]["height"] == 792


def test_unknown_document_id():
    res = client.get("/api/pdf/nonexistent_doc_id/info")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


def test_unknown_export_id():
    res = client.get("/api/pdf/export/nonexistent_export/download")
    assert res.status_code == 404


def test_path_traversal_protection():
    res = client.get("/api/pdf/../../etc/passwd/info")
    # FastAPI path parser returns 404
    assert res.status_code in (404, 400)


def test_export_with_various_objects():
    pdf_bytes = create_test_pdf(num_pages=2, text="Export Target")
    upload_res = client.post(
        "/api/pdf/upload",
        files={"file": ("export_target.pdf", pdf_bytes, "application/pdf")},
    )
    assert upload_res.status_code == 201
    doc_id = upload_res.json()["document_id"]

    # Sample 1x1 PNG base64 for signature
    sample_sig_base64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

    export_payload = {
        "objects": [
            {
                "id": "obj-txt-1",
                "page": 1,
                "type": "text",
                "x": 100,
                "y": 200,
                "width": 150,
                "height": 30,
                "properties": {
                    "text": "Approved Contract",
                    "font_size": 18,
                    "font_family": "helv",
                    "color": "#ff0000",
                    "bold": True,
                },
            },
            {
                "id": "obj-hl-1",
                "page": 1,
                "type": "highlight",
                "x": 50,
                "y": 100,
                "width": 200,
                "height": 20,
                "properties": {
                    "color": "#ffff00",
                    "opacity": 0.35,
                },
            },
            {
                "id": "obj-rect-1",
                "page": 1,
                "type": "rectangle",
                "x": 300,
                "y": 150,
                "width": 80,
                "height": 80,
                "properties": {
                    "border_color": "#0000ff",
                    "border_width": 2,
                    "fill": "#e0e0ff",
                    "fill_opacity": 0.5,
                },
            },
            {
                "id": "obj-circle-1",
                "page": 1,
                "type": "ellipse",
                "x": 300,
                "y": 250,
                "width": 60,
                "height": 60,
                "properties": {
                    "border_color": "#00aa00",
                    "border_width": 3,
                },
            },
            {
                "id": "obj-draw-1",
                "page": 2,
                "type": "drawing",
                "x": 50,
                "y": 50,
                "width": 100,
                "height": 100,
                "properties": {
                    "color": "#333333",
                    "width": 2,
                    "points": [{"x": 50, "y": 50}, {"x": 80, "y": 90}, {"x": 120, "y": 60}],
                },
            },
            {
                "id": "obj-sig-1",
                "page": 2,
                "type": "signature",
                "x": 200,
                "y": 400,
                "width": 120,
                "height": 60,
                "properties": {
                    "image_data": sample_sig_base64,
                },
            },
        ]
    }

    export_res = client.post(f"/api/pdf/{doc_id}/export", json=export_payload)
    assert export_res.status_code == 200
    exp_data = export_res.json()
    assert "export_id" in exp_data
    assert exp_data["filename"] == "export_target-edited.pdf"
    assert exp_data["download_url"].startswith("/api/pdf/export/")

    export_id = exp_data["export_id"]

    # Download the exported PDF
    down_res = client.get(f"/api/pdf/export/{export_id}/download")
    assert down_res.status_code == 200
    assert down_res.headers["content-type"] == "application/pdf"
    exported_bytes = down_res.content

    # Inspect the exported PDF with PyMuPDF
    exported_doc = pymupdf.open(stream=exported_bytes, filetype="pdf")
    assert len(exported_doc) == 2

    # Check that text was inserted on Page 1
    page1_text = exported_doc[0].get_text()
    assert "Approved Contract" in page1_text

    exported_doc.close()


def test_file_size_limit(monkeypatch):
    import app.config as cfg
    monkeypatch.setattr(cfg, "MAX_FILE_SIZE_MB", 0)  # limit 0 MB to trigger reject
    pdf_bytes = create_test_pdf(num_pages=1, text="Oversized")
    res = client.post(
        "/api/pdf/upload",
        files={"file": ("large.pdf", pdf_bytes, "application/pdf")},
    )
    assert res.status_code == 400
    assert "exceeds the maximum allowed file size" in res.json()["detail"]


def test_page_count_limit(monkeypatch):
    import app.config as cfg
    monkeypatch.setattr(cfg, "MAX_PAGES", 2)  # max 2 pages
    pdf_bytes = create_test_pdf(num_pages=3, text="Too many pages")
    res = client.post(
        "/api/pdf/upload",
        files={"file": ("pages.pdf", pdf_bytes, "application/pdf")},
    )
    assert res.status_code == 400
    assert "exceeds the maximum allowed page count" in res.json()["detail"]


def test_extract_page_text_lines():
    pdf_bytes = create_test_pdf(num_pages=1, text="Unique Contract Phrase")
    upload_res = client.post(
        "/api/pdf/upload",
        files={"file": ("contract.pdf", pdf_bytes, "application/pdf")},
    )
    assert upload_res.status_code == 201
    doc_id = upload_res.json()["document_id"]

    text_res = client.get(f"/api/pdf/{doc_id}/pages/1/text")
    assert text_res.status_code == 200
    lines = text_res.json()
    assert len(lines) >= 1
    assert any("Unique Contract Phrase" in l["text"] for l in lines)
    assert len(lines[0]["bbox"]) == 4


def test_export_with_text_replace():
    pdf_bytes = create_test_pdf(num_pages=1, text="ORIGINAL AGREEMENT")
    upload_res = client.post(
        "/api/pdf/upload",
        files={"file": ("agreement.pdf", pdf_bytes, "application/pdf")},
    )
    doc_id = upload_res.json()["document_id"]

    # Extract lines to get exact bbox
    text_res = client.get(f"/api/pdf/{doc_id}/pages/1/text")
    lines = text_res.json()
    target_line = next(l for l in lines if "ORIGINAL AGREEMENT" in l["text"])

    # Export with text_replace
    export_payload = {
        "objects": [
            {
                "id": "replace-1",
                "page": 1,
                "type": "text_replace",
                "x": target_line["bbox"][0],
                "y": target_line["bbox"][1],
                "width": target_line["bbox"][2] - target_line["bbox"][0],
                "height": target_line["bbox"][3] - target_line["bbox"][1],
                "properties": {
                    "orig_bbox": target_line["bbox"],
                    "text": "AMENDED AND RESTATED AGREEMENT",
                    "font_size": 16,
                    "font_family": "helv",
                    "color": "#000000",
                    "bg_color": "#ffffff",
                },
            }
        ]
    }

    exp_res = client.post(f"/api/pdf/{doc_id}/export", json=export_payload)
    assert exp_res.status_code == 200
    export_id = exp_res.json()["export_id"]

    down_res = client.get(f"/api/pdf/export/{export_id}/download")
    assert down_res.status_code == 200

    # Inspect resulting PDF
    doc = pymupdf.open(stream=down_res.content, filetype="pdf")
    page_text = doc[0].get_text()
    doc.close()

    # Original text must be redacted/gone and new text must be present
    assert "ORIGINAL AGREEMENT" not in page_text
    assert "AMENDED AND RESTATED AGREEMENT" in page_text


