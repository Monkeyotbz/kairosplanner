-- ============================================================
-- KAIROS — Fase 3.1: agendar subtareas individuales
-- Añade subtarea_id a eventos_calendario.
-- Ejecutar en Supabase Dashboard > SQL Editor.
-- Las políticas RLS existentes (por proyecto_id) ya cubren la fila;
-- no se requieren políticas nuevas.
-- ============================================================

alter table eventos_calendario
  add column if not exists subtarea_id uuid
  references subtareas(id) on delete cascade;
