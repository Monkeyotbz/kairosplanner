-- ============================================================
-- KAIROS — Políticas INSERT / DELETE / UPDATE faltantes
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ============================================================

-- ── PROYECTOS ─────────────────────────────────────────────────
create policy "Usuarios crean proyectos"
  on proyectos for insert
  with check (auth.uid() = creado_por);

create policy "Admin actualiza proyecto"
  on proyectos for update
  using (creado_por = auth.uid() or is_project_member(id));

-- ── MIEMBROS ──────────────────────────────────────────────────
-- Auto-inserción al crear proyecto (creador) o admin invitando
create policy "Crear membresía"
  on miembros for insert
  with check (
    exists (
      select 1 from proyectos p
      where p.id = miembros.proyecto_id
        and p.creado_por = auth.uid()
    )
    or exists (
      select 1 from miembros m
      where m.proyecto_id = miembros.proyecto_id
        and m.usuario_id = auth.uid()
        and m.rol = 'admin'
    )
  );

create policy "Admin elimina miembros"
  on miembros for delete
  using (
    exists (
      select 1 from miembros m
      where m.proyecto_id = miembros.proyecto_id
        and m.usuario_id = auth.uid()
        and m.rol = 'admin'
    )
  );

-- ── TABLEROS ──────────────────────────────────────────────────
create policy "Miembros crean tableros"
  on tableros for insert
  with check (is_project_member(proyecto_id));

create policy "Miembros actualizan tableros"
  on tableros for update
  using (is_project_member(proyecto_id));

-- ── COLUMNAS ──────────────────────────────────────────────────
create policy "Miembros crean columnas"
  on columnas for insert
  with check (
    exists (
      select 1 from tableros t
      where t.id = columnas.tablero_id
        and is_project_member(t.proyecto_id)
    )
  );

create policy "Miembros actualizan columnas"
  on columnas for update
  using (
    exists (
      select 1 from tableros t
      where t.id = columnas.tablero_id
        and is_project_member(t.proyecto_id)
    )
  );

-- ── ETIQUETAS ─────────────────────────────────────────────────
create policy "Miembros crean etiquetas"
  on etiquetas for insert
  with check (is_project_member(proyecto_id));

-- ── TARJETAS ──────────────────────────────────────────────────
create policy "Miembros crean tarjetas"
  on tarjetas for insert
  with check (
    exists (
      select 1 from columnas c
      join tableros t on t.id = c.tablero_id
      where c.id = tarjetas.columna_id
        and is_project_member(t.proyecto_id)
    )
  );

create policy "Miembros eliminan tarjetas"
  on tarjetas for delete
  using (
    exists (
      select 1 from columnas c
      join tableros t on t.id = c.tablero_id
      where c.id = tarjetas.columna_id
        and is_project_member(t.proyecto_id)
    )
  );

-- ── TARJETA_ETIQUETA ──────────────────────────────────────────
create policy "Miembros crean tarjeta_etiqueta"
  on tarjeta_etiqueta for insert
  with check (
    exists (
      select 1 from tarjetas ta
      join columnas c on c.id = ta.columna_id
      join tableros t on t.id = c.tablero_id
      where ta.id = tarjeta_etiqueta.tarjeta_id
        and is_project_member(t.proyecto_id)
    )
  );

create policy "Miembros eliminan tarjeta_etiqueta"
  on tarjeta_etiqueta for delete
  using (
    exists (
      select 1 from tarjetas ta
      join columnas c on c.id = ta.columna_id
      join tableros t on t.id = c.tablero_id
      where ta.id = tarjeta_etiqueta.tarjeta_id
        and is_project_member(t.proyecto_id)
    )
  );
