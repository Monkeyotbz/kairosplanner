-- ============================================================
-- KAIROS — Enlaces de invitación a proyectos
-- El botón "Copiar enlace" del modal de Invitar copiaba un URL fijo
-- (la landing page), sin ningún código real — quien lo abriera no
-- quedaba agregado a ningún proyecto. Esto agrega invitaciones reales:
-- un token por proyecto que, al abrirlo (/join/:id) y estar logueado,
-- une al usuario actual como miembro.
--
-- La política normal de INSERT en `miembros` ("Crear membresía") solo
-- deja que el creador o un admin agreguen gente — no que alguien se
-- una solo. accept_invitation() es SECURITY DEFINER justamente para
-- permitir ese caso puntual, sin abrir la tabla `miembros` en general.
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================

create table if not exists invitaciones (
  id          uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references proyectos(id) on delete cascade,
  creado_por  uuid not null references auth.users(id) on delete cascade,
  creado_en   timestamptz not null default now()
);

alter table invitaciones enable row level security;

-- Cualquier usuario autenticado puede leer una invitación por su id
-- (para validar el link) — solo expone el proyecto_id, que de todas
-- formas es justo lo que se comparte al invitar.
create policy "leer invitación por id"
  on invitaciones for select
  using (auth.uid() is not null);

-- Solo miembros del proyecto pueden generar invitaciones para él.
create policy "miembros crean invitaciones"
  on invitaciones for insert
  with check (is_project_member(proyecto_id) and creado_por = auth.uid());

-- Canjea una invitación: valida el token y agrega al usuario actual
-- como miembro del proyecto. Devuelve el proyecto_id para poder
-- redirigir al tablero correcto.
create or replace function accept_invitation(invite_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proyecto_id uuid;
begin
  select proyecto_id into v_proyecto_id from invitaciones where id = invite_id;
  if v_proyecto_id is null then
    raise exception 'Invitación no válida';
  end if;

  insert into miembros (proyecto_id, usuario_id, rol)
  values (v_proyecto_id, auth.uid(), 'miembro')
  on conflict (proyecto_id, usuario_id) do nothing;

  return v_proyecto_id;
end;
$$;
