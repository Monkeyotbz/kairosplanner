-- ============================================================
-- KAIROS — Sincronización Google Calendar → Kairos (por proyecto)
-- Tabla que guarda la conexión OAuth de Google Calendar de un
-- proyecto: tokens, calendario conectado, y estado del canal de
-- notificaciones push (events.watch).
--
-- Esta tabla NUNCA debe tener políticas RLS para 'anon'/'authenticated'.
-- Es un bloqueo intencional y permanente (no transitorio como el caso
-- de registros_tiempo_rls.sql) — solo el backend, usando
-- SUPABASE_SERVICE_KEY (backend/src/config/supabase.js), puede leer
-- o escribir refresh_token/access_token. El frontend jamás debe verlos.
-- Ejecutar en Supabase Dashboard > SQL Editor.
-- ============================================================

create table google_calendar_conexiones (
  id                    uuid primary key default uuid_generate_v4(),
  proyecto_id           uuid not null references proyectos(id) on delete cascade,
  google_calendar_id    text not null default 'primary',
  google_account_email  text,
  refresh_token         text not null,
  access_token          text,
  access_token_expira   timestamptz,
  sync_token            text,
  channel_id            uuid,
  resource_id           text,
  channel_token         text,
  channel_expira        timestamptz,
  ultima_sync_at        timestamptz,
  estado                text not null default 'activo', -- 'activo' | 'error' | 'revocado'
  ultimo_error          text,
  creado_por            uuid references auth.users(id) on delete set null,
  creado_at             timestamptz not null default now(),
  actualizado_at        timestamptz not null default now(),
  unique (proyecto_id)
);

alter table google_calendar_conexiones enable row level security;
-- Sin políticas a propósito: bloqueada por completo para cualquier
-- rol de cliente. Solo el rol de servicio la puede tocar.
