-- ============================================================
-- KAIROS — Presupuestos (Zero-Based Budgeting)
-- Límite de gasto mensual por categoría. Recurrente: el mismo
-- límite aplica cada mes; el progreso se calcula contra los
-- gastos del mes en curso de esa categoría.
-- Ejecutar en Supabase Dashboard > SQL Editor.
-- Idempotente: se puede correr varias veces sin error.
-- ============================================================

create table if not exists presupuestos (
  id           uuid primary key default uuid_generate_v4(),
  usuario_id   uuid references auth.users(id) on delete cascade not null,
  categoria_id uuid references categorias_finanzas(id) on delete cascade not null,
  monto_limite numeric(12, 2) not null check (monto_limite > 0),
  creado_en    timestamptz default now(),
  -- Un solo presupuesto por categoría y usuario
  unique (usuario_id, categoria_id)
);

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

-- ============================================================
-- Tope de costos por proyecto (Zero-Based para proyectos)
-- Un solo tope mensual de costos por proyecto; el progreso se
-- calcula contra los costos del mes en curso del proyecto.
-- ============================================================

create table if not exists presupuestos_proyecto (
  id           uuid primary key default uuid_generate_v4(),
  proyecto_id  uuid references proyectos(id) on delete cascade not null unique,
  usuario_id   uuid references auth.users(id) on delete set null,
  monto_limite numeric(12, 2) not null check (monto_limite > 0),
  creado_en    timestamptz default now()
);

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
