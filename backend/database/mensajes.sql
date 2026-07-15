-- Tabla de mensajes del chat por proyecto
create table if not exists mensajes (
  id          uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references proyectos(id) on delete cascade,
  usuario_id  uuid not null references auth.users(id) on delete cascade,
  contenido   text not null check (char_length(contenido) > 0 and char_length(contenido) <= 2000),
  created_at  timestamptz not null default now()
);

-- Índice para consultas por proyecto (más recientes primero)
create index if not exists mensajes_proyecto_created_idx
  on mensajes (proyecto_id, created_at desc);

-- RLS
alter table mensajes enable row level security;

-- Solo miembros del proyecto pueden leer mensajes
create policy "mensajes_select" on mensajes
  for select using (
    exists (
      select 1 from miembros
      where miembros.proyecto_id = mensajes.proyecto_id
        and miembros.usuario_id  = auth.uid()
    )
    or exists (
      select 1 from proyectos
      where proyectos.id         = mensajes.proyecto_id
        and proyectos.creado_por = auth.uid()
    )
  );

-- Solo miembros del proyecto pueden insertar mensajes
create policy "mensajes_insert" on mensajes
  for insert with check (
    usuario_id = auth.uid()
    and (
      exists (
        select 1 from miembros
        where miembros.proyecto_id = mensajes.proyecto_id
          and miembros.usuario_id  = auth.uid()
      )
      or exists (
        select 1 from proyectos
        where proyectos.id         = mensajes.proyecto_id
          and proyectos.creado_por = auth.uid()
      )
    )
  );

-- Habilitar Realtime para esta tabla
alter publication supabase_realtime add table mensajes;
