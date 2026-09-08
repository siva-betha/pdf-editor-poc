from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class UploadResponse(BaseModel):
    document_id: str
    filename: str
    page_count: int
    file_size: int


class PageInfo(BaseModel):
    page_number: int
    width: float
    height: float


class PdfInfoResponse(BaseModel):
    document_id: str
    filename: str
    page_count: int
    file_size: int
    pages: List[PageInfo]


EditorObjectType = Literal["text", "highlight", "drawing", "rectangle", "ellipse", "signature", "text_replace"]


class TextLineInfo(BaseModel):
    id: str
    page: int
    bbox: List[float] = Field(..., description="[x0, y0, x1, y1] in PDF points")
    text: str
    font: str
    size: float
    color: str = "#000000"


class EditorObject(BaseModel):
    id: str
    page: int = Field(..., ge=1, description="1-indexed page number")
    type: EditorObjectType
    x: float
    y: float
    width: float
    height: float
    rotation: Optional[float] = 0.0
    properties: Dict[str, Any] = Field(default_factory=dict)


class ExportRequest(BaseModel):
    objects: List[EditorObject] = Field(default_factory=list)


class ExportResponse(BaseModel):
    document_id: str
    export_id: str
    filename: str
    download_url: str


class HealthResponse(BaseModel):
    status: str
