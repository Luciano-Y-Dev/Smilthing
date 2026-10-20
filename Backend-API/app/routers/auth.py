from fastapi import APIRouter, Request, Response

from app import auth
from app.models import CuentaPasswordInput, LoginInput, MeResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=MeResponse)
def login(input: LoginInput, request: Request, response: Response) -> MeResponse:
    return auth.login(input, request, response)


@router.post("/logout")
def logout(request: Request, response: Response) -> dict[str, bool]:
    return auth.logout(request, response)


@router.get("/me", response_model=MeResponse)
def me(request: Request) -> MeResponse:
    return auth.me_public(request)


@router.patch("/cuenta")
def change_password(
    input: CuentaPasswordInput, ctx: auth.AuthContext = auth.CurrentUserDep
) -> dict[str, bool]:
    return auth.change_password(ctx, input.current_password, input.new_password)
