import typer

from app import auth, db, superauth
from app.auth import hash_password
from datetime import date, timedelta

cli = typer.Typer(help="Administración de clínicas")


@cli.command("createsuperuser")
def createsuperuser(
    email: str,
    password: str = typer.Option(..., "--password"),
) -> None:
    db.init_global_schema()
    ctx = superauth.create_superuser(email, password)
    typer.echo(f"Superusuario #{ctx.super_id} '{ctx.email}' creado.")


@cli.command("create-clinic")
def create_clinic(
    nombre: str,
    email: str = typer.Option(..., "--email"),
    password: str = typer.Option(..., "--password"),
) -> None:
    ctx = auth.create_clinic_with_admin(nombre, email, password)
    typer.echo(f"Clínica #{ctx.clinica_id} '{ctx.clinica.nombre}' creada. Trial hasta {ctx.clinica.trial_expires}.")


@cli.command("list")
def list_clinics() -> None:
    db.init_global_schema()
    with db.admin_connection() as conn:
        rows = conn.execute(
            """
            SELECT c.id, c.nombre, c.estado, c.trial_expires,
                   (SELECT COUNT(*) FROM usuarios u WHERE u.clinica_id = c.id) AS usuarios
            FROM clinicas c ORDER BY c.id
            """
        ).fetchall()
    if not rows:
        typer.echo("No hay clínicas registradas.")
        return
    for r in rows:
        typer.echo(
            f"#{r['id']}  {r['nombre']}  estado={r['estado']}  "
            f"trial_hasta={r['trial_expires']}  usuarios={r['usuarios']}"
        )


@cli.command("extend")
def extend(clinica_id: int, dias: int = typer.Option(30, "--dias")) -> None:
    with db.admin_connection() as conn:
        row = conn.execute(
            "SELECT estado, trial_expires FROM clinicas WHERE id = %s", (clinica_id,)
        ).fetchone()
        if row is None:
            typer.echo("Clínica no encontrada.")
            raise typer.Exit(code=1)
        base = row["trial_expires"] or date.today()
        if base < date.today():
            base = date.today()
        new_expiry = base + timedelta(days=dias)
        conn.execute(
            "UPDATE clinicas SET trial_expires = %s, estado = 'trial' WHERE id = %s",
            (new_expiry, clinica_id),
        )
    typer.echo(f"Clínica #{clinica_id} extendida hasta {new_expiry}.")


@cli.command("suspend")
def suspend(clinica_id: int) -> None:
    with db.admin_connection() as conn:
        result = conn.execute(
            "UPDATE clinicas SET estado = 'suspendido' WHERE id = %s", (clinica_id,)
        )
    if result.rowcount == 0:
        typer.echo("Clínica no encontrada.")
        raise typer.Exit(code=1)
    typer.echo(f"Clínica #{clinica_id} suspendida.")


@cli.command("reactivate")
def reactivate(clinica_id: int, dias: int = typer.Option(30, "--dias")) -> None:
    with db.admin_connection() as conn:
        row = conn.execute(
            "SELECT id FROM clinicas WHERE id = %s", (clinica_id,)
        ).fetchone()
        if row is None:
            typer.echo("Clínica no encontrada.")
            raise typer.Exit(code=1)
        new_expiry = date.today() + timedelta(days=dias)
        conn.execute(
            "UPDATE clinicas SET estado = 'trial', trial_expires = %s WHERE id = %s",
            (new_expiry, clinica_id),
        )
    typer.echo(f"Clínica #{clinica_id} reactivada (trial hasta {new_expiry}).")


@cli.command("reset-password")
def reset_password(email: str, password: str = typer.Option(..., "--password")) -> None:
    with db.admin_connection() as conn:
        result = conn.execute(
            "UPDATE usuarios SET password_hash = %s, must_change_password = TRUE WHERE email = %s",
            (hash_password(password), email.lower()),
        )
    if result.rowcount == 0:
        typer.echo("Usuario no encontrado.")
        raise typer.Exit(code=1)
    typer.echo("Contraseña actualizada.")


@cli.command("migrate")
def migrate() -> None:
    results = db.migrate_all_tenants()
    if not results:
        typer.echo("No hay bases de datos de clínicas.")
        return
    for name, applied in results.items():
        typer.echo(f"{name}: {applied} migración(es) aplicadas.")


if __name__ == "__main__":
    cli()
