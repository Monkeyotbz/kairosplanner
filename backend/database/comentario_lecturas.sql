-- ============================================================
-- KAIROS — Registro de "última lectura" de comentarios por tarjeta
-- Permite calcular "comentarios sin leer" por tarjeta y por usuario:
-- una tarjeta tiene comentarios sin leer si algún comentario es más
-- reciente que la última_lectura del usuario actual (o si nunca la
-- ha leído y sí tiene comentarios).
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================

create table if not exists comentario_lecturas (
  usuario_id     uuid not null references auth.users(id) on delete cascade,
  tarjeta_id     uuid not null references tarjetas(id) on delete cascade,
  ultima_lectura timestamptz not null default now(),
  primary key (usuario_id, tarjeta_id)
);

alter table comentario_lecturas enable row level security;

-- Cada usuario solo ve/gestiona sus propias marcas de lectura.
create policy "lectura_select" on comentario_lecturas
  for select using (usuario_id = auth.uid());

create policy "lectura_insert" on comentario_lecturas
  for insert with check (usuario_id = auth.uid());

create policy "lectura_update" on comentario_lecturas
  for update using (usuario_id = auth.uid());
