-- ============================================================
-- KAIROS — Presupuestos (Zero-Based Budgeting) — POR MES
-- Cada mes puede tener su propio límite. Si un mes no tiene
-- valor propio, hereda del mes anterior más reciente.
-- Ejecutar en Supabase Dashboard > SQL Editor.
-- Idempotente: se puede correr varias veces sin error.
-- ============================================================

-- ── Presupuestos personales (por categoría y mes) ────────────
create table if not exists presupuestos (
  id           uuid primary key default uuid_generate_v4(),
  usuario_id   uuid references auth.users(id) on delete cascade not null,
  categoria_id uuid references categorias_finanzas(id) on delete cascade not null,
  monto_limite numeric(12, 2) not null check (monto_limite > 0),
  anio         int not null,
  mes          int not null check (mes between 1 and 12),
  creado_en    timestamptz default now()
);

-- Migración desde la versión anterior (sin anio/mes)
alter table presupuestos add column if not exists anio int;
alter table presupuestos add column if not exists mes  int;
update presupuestos set anio = extract(year  from creado_en)::int where anio is null;
update presupuestos set mes  = extract(month from creado_en)::int where mes  is null;
alter table presupuestos alter column anio set not null;
alter table presupuestos alter column mes  set not null;

-- Unicidad: un valor por categoría + mes (antes era por categoría)
alter table presupuestos drop constraint if exists presupuestos_usuario_id_categoria_id_key;
alter table presupuestos drop constraint if exists presupuestos_mes_unico;
alter table presupuestos add  constraint presupuestos_mes_unico
  unique (usuario_id, categoria_id, anio, mes);

alter table presupuestos enable row level security;

drop policy if exists "Ver mis presupuestos" on presupuestos;
create policy "Ver mis presupuestos"
  on presupuestos for select using (usuario_id = auth.uid());

drop policy if exists "Crear mis presupuestos" on presupuestos;
create policy "Crear mis presupuestos"
  on presupuestos for insert with check (usuario_id = auth.uid());

drop policy if exists "Editar mis presupuestos" on presupuestos;
create policy "Editar mis presupuestos"
  on presupuestos for update using (usuario_id = auth.uid());

drop policy if exists "Eliminar mis presupuestos" on presupuestos;
create policy "Eliminar mis presupuestos"
  on presupuestos for delete using (usuario_id = auth.uid());

-- ── Tope de costos por proyecto (por mes) ────────────────────
create table if not exists presupuestos_proyecto (
  id           uuid primary key default uuid_generate_v4(),
  proyecto_id  uuid references proyectos(id) on delete cascade not null,
  usuario_id   uuid references auth.users(id) on delete set null,
  monto_limite numeric(12, 2) not null check (monto_limite > 0),
  anio         int not null,
  mes          int not null check (mes between 1 and 12),
  creado_en    timestamptz default now()
);

-- Migración desde la versión anterior (sin anio/mes)
alter table presupuestos_proyecto add column if not exists anio int;
alter table presupuestos_proyecto add column if not exists mes  int;
update presupuestos_proyecto set anio = extract(year  from creado_en)::int where anio is null;
update presupuestos_proyecto set mes  = extract(month from creado_en)::int where mes  is null;
alter table presupuestos_proyecto alter column anio set not null;
alter table presupuestos_proyecto alter column mes  set not null;

alter table presupuestos_proyecto drop constraint if exists presupuestos_proyecto_proyecto_id_key;
alter table presupuestos_proyecto drop constraint if exists presupuestos_proyecto_mes_unico;
alter table presupuestos_proyecto add  constraint presupuestos_proyecto_mes_unico
  unique (proyecto_id, anio, mes);

alter table presupuestos_proyecto enable row level security;

drop policy if exists "Miembros ven tope de costos" on presupuestos_proyecto;
create policy "Miembros ven tope de costos"
  on presupuestos_proyecto for select using (is_project_member(proyecto_id));

drop policy if exists "Miembros crean tope de costos" on presupuestos_proyecto;
create policy "Miembros crean tope de costos"
  on presupuestos_proyecto for insert with check (is_project_member(proyecto_id));

drop policy if exists "Miembros editan tope de costos" on presupuestos_proyecto;
create policy "Miembros editan tope de costos"
  on presupuestos_proyecto for update using (is_project_member(proyecto_id));

drop policy if exists "Miembros eliminan tope de costos" on presupuestos_proyecto;
create policy "Miembros eliminan tope de costos"
  on presupuestos_proyecto for delete using (is_project_member(proyecto_id));
