import base64
import logging
import re
import uuid
from pathlib import Path
from typing import List, Optional, Tuple
import pymupdf

from app.config import EXPORT_DIR_PATH
from app.models import EditorObject, ExportResponse
from app.services.pdf_service import (
    cleanup_expired_files,
    get_document_metadata,
    get_document_pdf_path,
)

logger = logging.getLogger(__name__)


def hex_to_rgb(hex_str: Optional[str], default: Tuple[float, float, float] = (0.0, 0.0, 0.0)) -> Tuple[float, float, float]:
    """Converts a hex color string (#RRGGBB or #RGB) to an RGB tuple of floats (0.0 to 1.0)."""
    if not hex_str or hex_str.lower() in ("transparent", "none", ""):
        return default
    s = hex_str.strip().lstrip("#")
    if len(s) == 3:
        s = "".join([c * 2 for c in s])
    if len(s) != 6:
        return default
    try:
        r = int(s[0:2], 16) / 255.0
        g = int(s[2:4], 16) / 255.0
        b = int(s[4:6], 16) / 255.0
        return (r, g, b)
    except Exception:
        return default


def parse_font_name(family: Optional[str], bold: bool = False, italic: bool = False) -> str:
    """Maps general font family and style to standard PyMuPDF built-in fonts."""
    f = (family or "").lower()
    if "times" in f or "serif" in f and "sans" not in f:
        base = "ti"
        if bold and italic:
            return "tibi"
        if bold:
            return "tibo"
        if italic:
            return "tiit"
        return "times"
    elif "courier" in f or "mono" in f:
        if bold and italic:
            return "cobi"
        if bold:
            return "cobo"
        if italic:
            return "coit"
        return "courier"
    else:  # Helvetica / Arial / Sans-serif default
        if bold and italic:
            return "hebi"
        if bold:
            return "hebo"
        if italic:
            return "heit"
        return "helv"


def apply_editor_objects(doc: pymupdf.Document, objects: List[EditorObject]) -> None:
    """Applies overlay objects to the PyMuPDF document pages."""
    # Group objects by 1-indexed page
    objects_by_page: dict[int, list[EditorObject]] = {}
    for obj in objects:
        objects_by_page.setdefault(obj.page, []).append(obj)

    for page_num, page_objects in objects_by_page.items():
        if page_num < 1 or page_num > len(doc):
            logger.warning("Object page %d out of range (1..%d), skipping", page_num, len(doc))
            continue
        page = doc[page_num - 1]

        # Phase 1: Apply redactions for text_replace objects to physically erase old text
        has_redactions = False
        for obj in page_objects:
            if obj.type == "text_replace":
                props = obj.properties or {}
                orig_bbox = props.get("orig_bbox")
                bg_color_hex = props.get("bg_color") or props.get("backgroundColor") or "#ffffff"
                bg_rgb = hex_to_rgb(bg_color_hex, (1.0, 1.0, 1.0))
                if orig_bbox and len(orig_bbox) == 4:
                    redact_rect = pymupdf.Rect(orig_bbox)
                else:
                    redact_rect = pymupdf.Rect(obj.x, obj.y, obj.x + obj.width, obj.y + obj.height)
                page.add_redact_annot(redact_rect, fill=bg_rgb)
                has_redactions = True

        if has_redactions:
            page.apply_redactions()

        for obj in page_objects:
            try:
                t = obj.type
                props = obj.properties or {}
                x0 = float(obj.x)
                y0 = float(obj.y)
                w = max(1.0, float(obj.width))
                h = max(1.0, float(obj.height))
                rect = pymupdf.Rect(x0, y0, x0 + w, y0 + h)

                if t in ("text", "text_replace"):
                    text_content = str(props.get("text", ""))
                    font_size = float(props.get("font_size") or props.get("fontSize") or 16.0)
                    font_family = str(props.get("font_family") or props.get("fontFamily") or "helv")
                    color_hex = str(props.get("color") or props.get("fill") or "#000000")
                    bold = bool(props.get("bold") or props.get("fontWeight") == "bold")
                    italic = bool(props.get("italic") or props.get("fontStyle") == "italic")
                    color = hex_to_rgb(color_hex, (0.0, 0.0, 0.0))
                    fontname = parse_font_name(font_family, bold, italic)

                    # Ensure rect is large enough for textbox insertion
                    text_rect = pymupdf.Rect(x0, y0, max(x0 + w, x0 + 100), max(y0 + h, y0 + font_size * 2))
                    rc = page.insert_textbox(
                        text_rect,
                        text_content,
                        fontsize=font_size,
                        fontname=fontname,
                        color=color,
                    )
                    # If textbox returned negative (text didn't fit), fall back to insert_text at baseline
                    if rc < 0:
                        page.insert_text(
                            pymupdf.Point(x0, y0 + font_size),
                            text_content,
                            fontsize=font_size,
                            fontname=fontname,
                            color=color,
                        )

                elif t == "highlight":
                    color_hex = str(props.get("color") or props.get("fill") or "#ffeb3b")
                    opacity = float(props.get("opacity") if props.get("opacity") is not None else 0.35)
                    fill_color = hex_to_rgb(color_hex, (1.0, 0.92, 0.23))
                    page.draw_rect(
                        rect,
                        color=None,
                        fill=fill_color,
                        fill_opacity=opacity,
                    )

                elif t == "rectangle":
                    stroke_hex = props.get("border_color") or props.get("stroke") or "#000000"
                    stroke_color = hex_to_rgb(stroke_hex, (0.0, 0.0, 0.0))
                    stroke_width = float(props.get("border_width") or props.get("stroke_width") or props.get("strokeWidth") or 2.0)
                    fill_hex = props.get("fill")
                    is_fill_transparent = not fill_hex or str(fill_hex).lower() in ("transparent", "none", "")
                    fill_color = None if is_fill_transparent else hex_to_rgb(str(fill_hex))
                    fill_opacity = float(props.get("fill_opacity") or props.get("opacity") or 1.0)
                    if is_fill_transparent:
                        fill_opacity = 0.0

                    page.draw_rect(
                        rect,
                        color=stroke_color,
                        width=stroke_width,
                        fill=fill_color,
                        fill_opacity=fill_opacity if fill_color else 0.0,
                    )

                elif t in ("ellipse", "circle"):
                    stroke_hex = props.get("border_color") or props.get("stroke") or "#000000"
                    stroke_color = hex_to_rgb(stroke_hex, (0.0, 0.0, 0.0))
                    stroke_width = float(props.get("border_width") or props.get("stroke_width") or props.get("strokeWidth") or 2.0)
                    fill_hex = props.get("fill")
                    is_fill_transparent = not fill_hex or str(fill_hex).lower() in ("transparent", "none", "")
                    fill_color = None if is_fill_transparent else hex_to_rgb(str(fill_hex))
                    fill_opacity = float(props.get("fill_opacity") or props.get("opacity") or 1.0)

                    page.draw_oval(
                        rect,
                        color=stroke_color,
                        width=stroke_width,
                        fill=fill_color,
                        fill_opacity=fill_opacity if fill_color else 0.0,
                    )

                elif t == "drawing":
                    stroke_hex = str(props.get("color") or props.get("stroke") or "#000000")
                    stroke_color = hex_to_rgb(stroke_hex, (0.0, 0.0, 0.0))
                    stroke_width = float(props.get("width") or props.get("stroke_width") or props.get("strokeWidth") or 2.0)
                    opacity = float(props.get("opacity") if props.get("opacity") is not None else 1.0)

                    # Points can be list of dicts [{"x": 10, "y": 20}] or list of pairs [[10, 20]]
                    raw_points = props.get("points") or []
                    mu_points = []
                    for pt in raw_points:
                        if isinstance(pt, dict) and "x" in pt and "y" in pt:
                            px = float(pt["x"])
                            py = float(pt["y"])
                            # If points were relative to object origin (e.g. Fabric path)
                            if props.get("points_relative", False):
                                px += x0
                                py += y0
                            mu_points.append(pymupdf.Point(px, py))
                        elif isinstance(pt, (list, tuple)) and len(pt) >= 2:
                            px = float(pt[0])
                            py = float(pt[1])
                            if props.get("points_relative", False):
                                px += x0
                                py += y0
                            mu_points.append(pymupdf.Point(px, py))

                    if len(mu_points) >= 2:
                        page.draw_polyline(
                            mu_points,
                            color=stroke_color,
                            width=stroke_width,
                            stroke_opacity=opacity,
                        )
                    elif len(mu_points) == 1:
                        # Single point: draw a small circle / dot
                        page.draw_circle(
                            mu_points[0],
                            radius=stroke_width / 2.0,
                            color=stroke_color,
                            fill=stroke_color,
                            fill_opacity=opacity,
                        )

                elif t == "signature":
                    image_data = props.get("image_data") or props.get("src") or props.get("data_url") or ""
                    if isinstance(image_data, str) and "," in image_data:
                        image_data = image_data.split(",", 1)[1]
                    if image_data:
                        image_bytes = base64.b64decode(image_data)
                        page.insert_image(rect, stream=image_bytes, keep_proportion=True)

            except Exception as exc:
                logger.exception("Failed to apply object %s (type %s) on page %d: %s", obj.id, obj.type, obj.page, exc)


def export_edited_pdf(document_id: str, objects: List[EditorObject]) -> ExportResponse:
    """Creates a new PDF with editor overlays applied and returns export info."""
    cleanup_expired_files()
    pdf_path = get_document_pdf_path(document_id)
    if not pdf_path:
        raise FileNotFoundError(f"Document {document_id} not found.")

    metadata = get_document_metadata(document_id) or {}
    orig_filename = metadata.get("filename", f"{document_id}.pdf")
    base_stem = Path(orig_filename).stem
    out_filename = f"{base_stem}-edited.pdf"

    export_id = uuid.uuid4().hex[:12]
    export_path = EXPORT_DIR_PATH / f"{export_id}.pdf"

    try:
        doc = pymupdf.open(pdf_path)
        apply_editor_objects(doc, objects)
        doc.save(export_path, garbage=4, deflate=True)
        doc.close()

        # Write export metadata
        meta_path = EXPORT_DIR_PATH / f"{export_id}.json"
        meta_path.write_text(
            f'{{"document_id": "{document_id}", "export_id": "{export_id}", "filename": "{out_filename}"}}',
            encoding="utf-8",
        )

        return ExportResponse(
            document_id=document_id,
            export_id=export_id,
            filename=out_filename,
            download_url=f"/api/pdf/export/{export_id}/download",
        )
    except Exception as exc:
        logger.exception("Failed to export PDF for %s: %s", document_id, exc)
        raise RuntimeError("PDF export failed.") from exc


def get_export_pdf_path(export_id: str) -> Optional[Tuple[Path, str]]:
    """Retrieves the exported PDF path and original output filename."""
    if not re.match(r"^[a-zA-Z0-9_-]{1,64}$", export_id):
        return None
    file_path = (EXPORT_DIR_PATH / f"{export_id}.pdf").resolve()
    if not (file_path.is_relative_to(EXPORT_DIR_PATH) and file_path.exists()):
        return None

    filename = f"{export_id}-edited.pdf"
    meta_path = (EXPORT_DIR_PATH / f"{export_id}.json").resolve()
    if meta_path.exists():
        try:
            import json
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            filename = meta.get("filename", filename)
        except Exception:
            pass

    return file_path, filename
