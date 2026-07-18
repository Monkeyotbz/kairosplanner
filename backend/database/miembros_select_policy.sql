-- ============================================================
-- KAIROS — Fix: los miembros de un proyecto no se veían entre sí
-- La política original "Ver mis membresías" (usuario_id = auth.uid())
-- dejaba ver SOLO la fila propia: el modal Invitar decía "Sin miembros",
-- el dropdown de Asignar salía vacío y el filtro por Miembro no servía.
-- Ahora cualquier miembro (o el creador) ve TODAS las membresías de sus
-- proyectos. is_project_member es SECURITY DEFINER, así que no hay
-- recursión al consultarse miembros desde su propia política.
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ============================================================

drop policy if exists "Ver mis membresías" on miembros;

create policy "Ver miembros de mis proyectos"
  on miembros for select
  using (
    usuario_id = auth.uid()
    or is_project_member(proyecto_id)
    or exists (
      select 1 from proyectos p
      where p.id = miembros.proyecto_id
        and p.creado_por = auth.uid()
    )
  );
