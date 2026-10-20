from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response

from app import backup
from app.deps import TenantScopeDep, get_tenant_scope

router = APIRouter(
    prefix="/api/backup",
    tags=["backup"],
    dependencies=[Depends(get_tenant_scope)],
)


@router.get("/descargar")
def descargar(scope: TenantScopeDep) -> Response:
    content = backup.create_backup_zip(scope)
    filename = f"respaldo_{scope.ctx.clinica.nombre}_{date.today().isoformat()}.zip"
    return Response(
        content=content,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/restaurar")
async def restaurar(
    scope: TenantScopeDep,
    file: Annotated[UploadFile, File()],
) -> dict[str, bool]:
    content = await file.read(backup.MAX_BACKUP_BYTES + 1)
    if len(content) > backup.MAX_BACKUP_BYTES:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "backup_demasiado_grande",
                "message": "El respaldo supera el tamaño máximo permitido.",
            },
        )
    return backup.restore_backup(scope, content)
