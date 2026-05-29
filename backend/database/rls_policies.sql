-- ============================================================
-- KAIROS — Políticas RLS
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ============================================================

-- Función helper: verifica si el usuario autenticado es miembro del proyecto
create or replace function public.is_project_member(p_proyecto_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.miembros
    where proyecto_id = p_proyecto_id
      and usuario_id = auth.uid()
  )
$$;

-- ── MIEMBROS ─────────────────────────────────────────────────
create policy "Ver mis membresías"
  on miembros for select using (usuario_id = auth.uid());

-- ── TABLEROS ─────────────────────────────────────────────────
create policy "Miembros ven tableros"
  on tableros for select using (is_project_member(proyecto_id));

-- ── COLUMNAS ─────────────────────────────────────────────────
create policy "Miembros ven columnas"
  on columnas for select using (
    exists (
      select 1 from tableros t
      where t.id = columnas.tablero_id
        and is_project_member(t.proyecto_id)
    )
  );

-- ── ETIQUETAS ────────────────────────────────────────────────
create policy "Miembros ven etiquetas"
  on etiquetas for select using (is_project_member(proyecto_id));

-- ── TARJETAS ─────────────────────────────────────────────────
create policy "Miembros ven tarjetas"
  on tarjetas for select using (
    exists (
      select 1 from columnas c
      join tableros t on t.id = c.tablero_id
      where c.id = tarjetas.columna_id
        and is_project_member(t.proyecto_id)
    )
  );

create policy "Miembros actualizan tarjetas"
  on tarjetas for update using (
    exists (
      select 1 from columnas c
      join tableros t on t.id = c.tablero_id
      where c.id = tarjetas.columna_id
        and is_project_member(t.proyecto_id)
    )
  );

-- ── TARJETA_ETIQUETA ─────────────────────────────────────────
create policy "Miembros ven tarjeta_etiqueta"
  on tarjeta_etiqueta for select using (
    exists (
      select 1 from tarjetas ta
      join columnas c on c.id = ta.columna_id
      join tableros t on t.id = c.tablero_id
      where ta.id = tarjeta_etiqueta.tarjeta_id
        and is_project_member(t.proyecto_id)
    )
  );

-- ── FRASES DEL DÍA ───────────────────────────────────────────
create policy "Usuarios autenticados ven frases"
  on frases_dia for select using (
    activa = true and auth.uid() is not null
  );

-- ── PLAYLISTS ────────────────────────────────────────────────
create policy "Usuarios autenticados ven playlists"
  on playlists for select using (
    activa = true and auth.uid() is not null
  );
