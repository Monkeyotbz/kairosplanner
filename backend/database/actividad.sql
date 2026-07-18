-- Historial de actividad por proyecto
create table if not exists actividad (
  id           uuid primary key default gen_random_uuid(),
  proyecto_id  uuid not null references proyectos(id) on delete cascade,
  usuario_id   uuid references auth.users(id),
  nombre_usuario text not null default 'Anónimo',
  descripcion  text not null,
  created_at   timestamptz not null default now()
);

create index if not exists actividad_proyecto_created_idx
  on actividad (proyecto_id, created_at desc);

alter table actividad enable row level security;

-- Miembros del proyecto pueden leer
create policy "actividad_select" on actividad
  for select using (
    exists (
      select 1 from miembros
      where miembros.proyecto_id = actividad.proyecto_id
        and miembros.usuario_id  = auth.uid()
    )
    or exists (
      select 1 from proyectos
      where proyectos.id         = actividad.proyecto_id
        and proyectos.creado_por = auth.uid()
    )
  );

-- Solo el propio usuario puede insertar sus acciones
create policy "actividad_insert" on actividad
  for insert with check (
    usuario_id = auth.uid()
    and (
      exists (
        select 1 from miembros
        where miembros.proyecto_id = actividad.proyecto_id
          and miembros.usuario_id  = auth.uid()
      )
      or exists (
        select 1 from proyectos
        where proyectos.id         = actividad.proyecto_id
          and proyectos.creado_por = auth.uid()
      )
    )
  );
