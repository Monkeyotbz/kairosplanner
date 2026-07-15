-- Permite eliminar tableros/proyectos completos (creador o admin del proyecto).
-- El resto de tablas (tableros, columnas, tarjetas, miembros, etiquetas...) caen
-- por "on delete cascade" al borrar la fila en proyectos.
-- Ejecutar en el SQL Editor de Supabase.

create policy "Admin elimina proyecto"
  on proyectos for delete
  using (
    creado_por = auth.uid()
    or exists (
      select 1 from miembros m
      where m.proyecto_id = proyectos.id
        and m.usuario_id = auth.uid()
        and m.rol = 'admin'
    )
  );
