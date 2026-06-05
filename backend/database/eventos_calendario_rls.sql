-- ============================================================
-- KAIROS — Políticas RLS para eventos_calendario (Fase 2: agendar)
-- Ejecutar en Supabase Dashboard > SQL Editor
-- Reutiliza la función is_project_member(uuid) ya existente.
-- ============================================================

-- Ver eventos de mis proyectos
create policy "Miembros ven eventos"
  on eventos_calendario for select
  using (is_project_member(proyecto_id));

-- Crear eventos en mis proyectos
create policy "Miembros crean eventos"
  on eventos_calendario for insert
  with check (is_project_member(proyecto_id));

-- Mover / redimensionar eventos
create policy "Miembros actualizan eventos"
  on eventos_calendario for update
  using (is_project_member(proyecto_id));

-- Quitar eventos del calendario
create policy "Miembros eliminan eventos"
  on eventos_calendario for delete
  using (is_project_member(proyecto_id));
