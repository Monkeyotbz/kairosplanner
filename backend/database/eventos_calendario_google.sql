-- ============================================================
-- KAIROS — Sincronización Google Calendar → Kairos (por proyecto)
-- Marca en eventos_calendario cuáles filas vienen de Google, para
-- distinguirlas en la UI (ícono, color, bloqueo de edición) y para
-- poder reconciliarlas (upsert/delete) por su id real de Google.
--
-- Las políticas RLS existentes (por proyecto_id, ver
-- eventos_calendario_rls.sql) ya cubren estas filas; no se requieren
-- políticas nuevas. Ejecutar en Supabase Dashboard > SQL Editor.
-- ============================================================

alter table eventos_calendario
  add column if not exists origen          text not null default 'kairos', -- 'kairos' | 'google'
  add column if not exists google_event_id text,
  add column if not exists google_etag     text;

-- Un evento de Google no debe duplicarse dentro del mismo proyecto.
-- Sin cláusula WHERE a propósito: Postgres no considera dos NULLs
-- iguales entre sí, así que los eventos nativos de Kairos (siempre
-- google_event_id = null) nunca chocan entre ellos — solo se aplica
-- de verdad entre filas que sí tienen el mismo google_event_id. Esto
-- además permite usar upsert(onConflict: 'proyecto_id,google_event_id')
-- directo desde el backend sin pelear con índices únicos parciales.
create unique index if not exists eventos_calendario_google_uniq
  on eventos_calendario (proyecto_id, google_event_id);
