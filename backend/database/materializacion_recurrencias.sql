-- Materialización de recurrentes → transacciones reales
-- Cuando llega la fecha de un recurrente (salario, renta…), el frontend
-- inserta la transacción automáticamente. Estas columnas dan soporte:
--   1. transacciones.recurrencia_id — enlaza el movimiento con su recurrente
--   2. índice único (recurrencia_id, fecha) — evita duplicados aunque haya
--      dos pestañas abiertas materializando a la vez
--   3. recurrencias.ultima_materializacion — hasta qué fecha ya se generaron
--      movimientos (si borras un movimiento auto, NO se vuelve a crear)
-- Correr en Supabase Dashboard → SQL Editor

alter table transacciones
  add column if not exists recurrencia_id uuid references recurrencias(id) on delete set null;

create unique index if not exists transacciones_recurrencia_fecha_uidx
  on transacciones (recurrencia_id, fecha);

create index if not exists transacciones_recurrencia_idx
  on transacciones (recurrencia_id);

alter table recurrencias
  add column if not exists ultima_materializacion date;
