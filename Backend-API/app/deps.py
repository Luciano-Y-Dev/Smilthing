from collections.abc import Iterator
from dataclasses import dataclass
from typing import Annotated

import psycopg
from fastapi import Depends, Request

from app import tenancy
from app.auth import AuthContext, require_user
from app.gate import check_gate


@dataclass
class TenantScope:
    ctx: AuthContext
    conn: psycopg.Connection
    fernet_key: str


def get_tenant_scope(request: Request) -> Iterator[TenantScope]:
    ctx = require_user(request)
    check_gate(ctx)
    fernet_key = tenancy.get_clinica_fernet_key(ctx.clinica_id)
    with tenancy.get_tenant_db(ctx.clinica_id) as conn:
        yield TenantScope(ctx=ctx, conn=conn, fernet_key=fernet_key)


TenantScopeDep = Annotated[TenantScope, Depends(get_tenant_scope)]
