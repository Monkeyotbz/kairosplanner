-- ============================================================
-- KAIROS — Presupuestos (Zero-Based Budgeting)
-- Límite de gasto mensual por categoría. Recurrente: el mismo
-- límite aplica cada mes; el progreso se calcula contra los
-- gastos del mes en curso de esa categoría.
-- Ejecutar en Supabase Dashboard > SQL Editor.
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

create policy "Ver mis presupuestos"
  on presupuestos for select using (usuario_id = auth.uid());

create policy "Crear mis presupuestos"
  on presupuestos for insert with check (usuario_id = auth.uid());

create policy "Editar mis presupuestos"
  on presupuestos for update using (usuario_id = auth.uid());

create policy "Eliminar mis presupuestos"
  on presupuestos for delete using (usuario_id = auth.uid());
