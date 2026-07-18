-- ============================================================
-- KAIROS — Políticas RLS para registros_tiempo
-- La tabla existía en schema.sql sin políticas (bloqueada) y sin
-- ningún código que la usara. Igual que con el filtro de "Miembro",
-- cada usuario solo ve y gestiona SUS PROPIOS registros de tiempo —
-- no los de otros miembros del proyecto.
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================

create policy "usuario ve sus registros de tiempo"
  on registros_tiempo for select using (usuario_id = auth.uid());

create policy "usuario crea sus registros de tiempo"
  on registros_tiempo for insert
  with check (
    usuario_id = auth.uid()
    and exists (
      select 1 from tarjetas ta
      join columnas c on c.id = ta.columna_id
      join tableros t on t.id = c.tablero_id
      where ta.id = registros_tiempo.tarjeta_id
        and is_project_member(t.proyecto_id)
    )
  );

create policy "usuario actualiza sus registros de tiempo"
  on registros_tiempo for update using (usuario_id = auth.uid());

create policy "usuario elimina sus registros de tiempo"
  on registros_tiempo for delete using (usuario_id = auth.uid());
