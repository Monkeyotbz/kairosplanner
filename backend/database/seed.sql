-- ============================================================
-- KAIROS — Datos de prueba
-- Usuario admin: cf5d14c8-a19a-4b07-8b71-804807a49c62
-- ============================================================

do $$
declare
  v_user_id    uuid := 'cf5d14c8-a19a-4b07-8b71-804807a49c62';
  v_proyecto   uuid;
  v_tablero    uuid;
  v_col_back   uuid;
  v_col_prog   uuid;
  v_col_rev    uuid;
  v_col_done   uuid;
  v_tag_dev    uuid;
  v_tag_ux     uuid;
  v_tag_mktg   uuid;
  v_tag_seo    uuid;
  v_tag_qa     uuid;
  v_card_1     uuid;
  v_card_2     uuid;
  v_card_3     uuid;
begin

  -- ── Proyecto ────────────────────────────────────────────────
  insert into proyectos (nombre, descripcion, creado_por)
  values ('Proyecto Alpha', 'Proyecto de demostración KAIROS', v_user_id)
  returning id into v_proyecto;

  -- ── Miembro admin ───────────────────────────────────────────
  insert into miembros (proyecto_id, usuario_id, rol)
  values (v_proyecto, v_user_id, 'admin');

  -- ── Tablero ─────────────────────────────────────────────────
  insert into tableros (proyecto_id, nombre, orden)
  values (v_proyecto, 'Tablero Principal', 0)
  returning id into v_tablero;

  -- ── Columnas ────────────────────────────────────────────────
  insert into columnas (tablero_id, nombre, orden, color) values (v_tablero, 'Backlog',     0, '#B4B2A9') returning id into v_col_back;
  insert into columnas (tablero_id, nombre, orden, color) values (v_tablero, 'En progreso', 1, '#378ADD') returning id into v_col_prog;
  insert into columnas (tablero_id, nombre, orden, color) values (v_tablero, 'Revisión',    2, '#EF9F27') returning id into v_col_rev;
  insert into columnas (tablero_id, nombre, orden, color) values (v_tablero, 'Hecho',       3, '#639922') returning id into v_col_done;

  -- ── Etiquetas ───────────────────────────────────────────────
  insert into etiquetas (proyecto_id, nombre, color) values (v_proyecto, 'Dev',  '#378ADD') returning id into v_tag_dev;
  insert into etiquetas (proyecto_id, nombre, color) values (v_proyecto, 'UX',   '#534AB7') returning id into v_tag_ux;
  insert into etiquetas (proyecto_id, nombre, color) values (v_proyecto, 'Mktg', '#D4537E') returning id into v_tag_mktg;
  insert into etiquetas (proyecto_id, nombre, color) values (v_proyecto, 'SEO',  '#639922') returning id into v_tag_seo;
  insert into etiquetas (proyecto_id, nombre, color) values (v_proyecto, 'QA',   '#1D9E75') returning id into v_tag_qa;

  -- ── Tarjetas de ejemplo ─────────────────────────────────────
  insert into tarjetas (columna_id, asignado_a, titulo, prioridad, fecha_limite, orden)
  values (v_col_back, v_user_id, 'Diseñar flujo de onboarding para nuevos usuarios', 'normal', current_date + 4, 0)
  returning id into v_card_1;
  insert into tarjeta_etiqueta values (v_card_1, v_tag_ux);

  insert into tarjetas (columna_id, asignado_a, titulo, prioridad, fecha_limite, orden)
  values (v_col_back, v_user_id, 'Fix bug #204 en rutas protegidas', 'alta', current_date + 6, 1)
  returning id into v_card_2;
  insert into tarjeta_etiqueta values (v_card_2, v_tag_dev);

  insert into tarjetas (columna_id, asignado_a, titulo, prioridad, fecha_limite, orden)
  values (v_col_prog, v_user_id, 'Refactor módulo de autenticación con JWT', 'alta', current_date + 5, 0)
  returning id into v_card_3;
  insert into tarjeta_etiqueta values (v_card_3, v_tag_dev);

  insert into tarjetas (columna_id, asignado_a, titulo, prioridad, fecha_limite, orden)
  values (v_col_prog, v_user_id, 'Newsletter mensual — template v2', 'normal', current_date + 3, 1);

  insert into tarjetas (columna_id, asignado_a, titulo, prioridad, fecha_limite, orden)
  values (v_col_rev, v_user_id, 'Landing page v2 — validación completa', 'alta', current_date + 2, 0);

  -- ── Frases del día ──────────────────────────────────────────
  insert into frases_dia (contenido, autor, creado_por, activa) values
    ('El enfoque profundo es la superpotencia del siglo XXI.', 'Cal Newport',   v_user_id, true),
    ('Primero lo primero.',                                    'Stephen Covey', v_user_id, true),
    ('La productividad no es hacer más cosas, es hacer las correctas.', 'Tim Ferriss', v_user_id, true);

  -- ── Playlist ────────────────────────────────────────────────
  insert into playlists (nombre, plataforma, url_externa, creado_por, activa)
  values ('Lofi Focus Mix', 'youtube', 'https://www.youtube.com/watch?v=jfKfPfyJRdk', v_user_id, true);

end $$;
