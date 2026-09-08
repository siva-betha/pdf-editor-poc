import os
from pathlib import Path
from typing import List

# Base paths
BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent

UPLOAD_DIR_PATH = Path(os.getenv("UPLOAD_DIR", str(PROJECT_ROOT / "uploads"))).resolve()
EXPORT_DIR_PATH = Path(os.getenv("EXPORT_DIR", str(PROJECT_ROOT / "exports"))).resolve()

UPLOAD_DIR_PATH.mkdir(parents=True, exist_ok=True)
EXPORT_DIR_PATH.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "50"))
MAX_PAGES = int(os.getenv("MAX_PAGES", "100"))
FILE_RETENTION_MINUTES = int(os.getenv("FILE_RETENTION_MINUTES", "30"))

CORS_ORIGINS_RAW = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
CORS_ORIGINS: List[str] = [origin.strip() for origin in CORS_ORIGINS_RAW.split(",") if origin.strip()]
