from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app import db
from app.config import get_media_dir

router = APIRouter(prefix="/api/clinicas", tags=["branding"])

MEDIA_TYPES = {"png": "image/png", "jpg": "image/jpeg", "webp": "image/webp"}

LOGO_NO_ENCONTRADO = {
    "code": "logo_no_encontrado",
    "message": "La clínica no tiene logo.",
}


@router.get("/{clinica_id}/logo")
def get_logo(clinica_id: int) -> FileResponse:
    with db.admin_connection() as conn:
        row = conn.execute(
            "SELECT logo_url FROM clinicas WHERE id = %s", (clinica_id,)
        ).fetchone()
    if row is None or not row["logo_url"]:
        raise HTTPException(status_code=404, detail=LOGO_NO_ENCONTRADO)
    logos_dir = get_media_dir() / "logos"
    files = sorted(logos_dir.glob(f"{clinica_id}.*")) if logos_dir.exists() else []
    if not files:
        raise HTTPException(status_code=404, detail=LOGO_NO_ENCONTRADO)
    ext = files[0].suffix.lstrip(".")
    return FileResponse(
        files[0],
        media_type=MEDIA_TYPES.get(ext, "application/octet-stream"),
        headers={"Cache-Control": "public, max-age=86400"},
    )
