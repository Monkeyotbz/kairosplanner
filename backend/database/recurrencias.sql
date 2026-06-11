-- Tabla de pagos / ingresos recurrentes para cash-flow forecasting
-- Correr en Supabase Dashboard → SQL Editor

create table if not exists recurrencias (
  id           uuid primary key default gen_random_uuid(),
  usuario_id   uuid not null references auth.users(id) on delete cascade,
  concepto     text not null,
  monto        numeric(12,2) not null check (monto > 0),
  tipo         text not null check (tipo in ('ingreso', 'gasto')),
  categoria_id uuid references categorias_finanzas(id) on delete set null,
  frecuencia   text not null check (frecuencia in (
    'diaria','semanal','quincenal','mensual','bimestral','trimestral','anual'
  )),
  dia_del_mes  int  check (dia_del_mes between 1 and 31),
  fecha_inicio date not null default current_date,
  fecha_fin    date,
  activa       boolean not null default true,
  creado_en    timestamptz default now()
);

alter table recurrencias enable row level security;

-- Cada usuario solo ve y modifica sus propias recurrencias
create policy "recurrencias_own" on recurrencias
  for all
  using  (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

-- Índice para consultas por usuario
create index if not exists recurrencias_usuario_idx on recurrencias (usuario_id);
