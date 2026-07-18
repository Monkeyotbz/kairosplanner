-- ============================================================
-- KAIROS — Políticas RLS para comentarios
-- La tabla comentarios tenía RLS activado (schema.sql) pero nunca se
-- le agregaron políticas, así que quedó completamente bloqueada desde
-- el inicio — CardComments.jsx ya intenta leer/escribir ahí, pero
-- fallaba en silencio. Reutiliza is_project_member(uuid), definida en
-- rls_policies.sql.
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================

create policy "Miembros ven comentarios"
  on comentarios for select using (
    exists (
      select 1 from tarjetas ta
      join columnas c on c.id = ta.columna_id
      join tableros t on t.id = c.tablero_id
      where ta.id = comentarios.tarjeta_id
        and is_project_member(t.proyecto_id)
    )
  );

create policy "Miembros crean comentarios"
  on comentarios for insert
  with check (
    autor_id = auth.uid()
    and exists (
      select 1 from tarjetas ta
      join columnas c on c.id = ta.columna_id
      join tableros t on t.id = c.tablero_id
      where ta.id = comentarios.tarjeta_id
        and is_project_member(t.proyecto_id)
    )
  );

create policy "Autor elimina su comentario"
  on comentarios for delete
  using (autor_id = auth.uid());
