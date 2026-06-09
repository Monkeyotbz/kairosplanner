-- Permite a los miembros del proyecto ELIMINAR columnas (listas).
-- INSERT y UPDATE ya existen en rls_insert_policies.sql; faltaba DELETE.
-- Ejecutar en el SQL Editor de Supabase.

create policy "Miembros eliminan columnas"
  on columnas for delete
  using (
    exists (
      select 1 from tableros t
      where t.id = columnas.tablero_id
        and is_project_member(t.proyecto_id)
    )
  );
