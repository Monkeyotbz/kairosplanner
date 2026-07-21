-- ============================================================
-- KAIROS — Fix: los miembros de un proyecto no se veían entre sí
-- (v2 — CORRIGE la recursión infinita de la v1)
--
-- La v1 incluía una cláusula `exists (select 1 from proyectos ...)`:
-- como la política de proyectos a su vez consulta miembros, Postgres
-- detectaba "infinite recursion detected in policy for relation
-- proyectos" y TODAS las queries fallaban (los tableros "desaparecían";
-- los datos nunca se tocaron).
--
-- Regla aprendida: una política de miembros NUNCA debe consultar
-- proyectos directamente (ni al revés). Solo funciones SECURITY
-- DEFINER como is_project_member, que leen sin pasar por RLS.
--
-- La cláusula eliminada no hacía falta: el creador de un proyecto
-- siempre recibe su fila admin en miembros al crearlo.
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================

drop policy if exists "Ver mis membresías" on miembros;
drop policy if exists "Ver miembros de mis proyectos" on miembros;

create policy "Ver miembros de mis proyectos"
  on miembros for select
  using (
    usuario_id = auth.uid()
    or is_project_member(proyecto_id)
  );
