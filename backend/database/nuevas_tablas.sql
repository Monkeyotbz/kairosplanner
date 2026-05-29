-- ============================================================
-- KAIROS — Tablas nuevas: Modo Enfoque + Finanzas
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 🎯 MODO ENFOQUE
-- ────────────────────────────────────────────────────────────

-- Sesiones de trabajo concentrado
create table sesiones_enfoque (
  id                uuid primary key default uuid_generate_v4(),
  usuario_id        uuid references auth.users(id) on delete cascade not null,
  proyecto_id       uuid references proyectos(id) on delete set null,
  tipo              text not null default 'libre',   -- 'pomodoro' | 'libre'
  duracion_plan_min int,                              -- duración planeada (null = libre)
  inicio            timestamptz not null default now(),
  fin               timestamptz,
  segundos_reales   int generated always as (
                      extract(epoch from (fin - inicio))::int
                    ) stored,
  estado            text not null default 'activa',  -- 'activa' | 'completada' | 'cancelada'
  creado_en         timestamptz default now()
);

-- Pausas dentro de una sesión
create table pausas_sesion (
  id          uuid primary key default uuid_generate_v4(),
  sesion_id   uuid references sesiones_enfoque(id) on delete cascade not null,
  inicio      timestamptz not null default now(),
  fin         timestamptz,
  tipo_pausa  text default 'corta',  -- 'corta' | 'larga'
  video_id    uuid                   -- FK a videos_pausa (se agrega abajo)
);

-- Videos de pausa activa
create table videos_pausa (
  id             uuid primary key default uuid_generate_v4(),
  titulo         text not null,
  url_youtube    text not null,
  categoria      text not null,    -- 'stretching' | 'respiracion' | 'meditacion' | 'caminata' | 'otro'
  es_predefinido boolean default false,
  creado_por     uuid references auth.users(id) on delete set null,
  activo         boolean default true,
  creado_en      timestamptz default now()
);

-- Agregar FK de pausas_sesion → videos_pausa ahora que la tabla existe
alter table pausas_sesion
  add constraint pausas_sesion_video_id_fkey
  foreign key (video_id) references videos_pausa(id) on delete set null;

-- ────────────────────────────────────────────────────────────
-- 💰 FINANZAS PERSONALES
-- ────────────────────────────────────────────────────────────

-- Categorías de ingresos y gastos personales
create table categorias_finanzas (
  id             uuid primary key default uuid_generate_v4(),
  usuario_id     uuid references auth.users(id) on delete cascade,
  nombre         text not null,
  tipo           text not null,    -- 'ingreso' | 'gasto'
  color          text not null default '#534AB7',
  icono          text not null default '◈',
  es_predefinida boolean default false,
  creado_en      timestamptz default now()
);

-- Transacciones personales
create table transacciones (
  id           uuid primary key default uuid_generate_v4(),
  usuario_id   uuid references auth.users(id) on delete cascade not null,
  categoria_id uuid references categorias_finanzas(id) on delete set null,
  concepto     text not null,
  monto        numeric(12, 2) not null check (monto > 0),
  tipo         text not null,    -- 'ingreso' | 'gasto'
  fecha        date not null default current_date,
  notas        text,
  creado_en    timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- 💼 FINANZAS POR PROYECTO
-- ────────────────────────────────────────────────────────────

create table finanzas_proyecto (
  id          uuid primary key default uuid_generate_v4(),
  proyecto_id uuid references proyectos(id) on delete cascade not null,
  usuario_id  uuid references auth.users(id) on delete cascade not null,
  concepto    text not null,
  monto       numeric(12, 2) not null check (monto > 0),
  tipo        text not null,    -- 'ingreso' | 'costo'
  fecha       date not null default current_date,
  notas       text,
  creado_en   timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- 📑 ÍNDICES
-- ────────────────────────────────────────────────────────────

create index on sesiones_enfoque (usuario_id, inicio);
create index on sesiones_enfoque (proyecto_id);
create index on transacciones (usuario_id, fecha);
create index on finanzas_proyecto (proyecto_id, fecha);

-- ────────────────────────────────────────────────────────────
-- 🔒 ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

alter table sesiones_enfoque  enable row level security;
alter table pausas_sesion     enable row level security;
alter table videos_pausa      enable row level security;
alter table categorias_finanzas enable row level security;
alter table transacciones     enable row level security;
alter table finanzas_proyecto enable row level security;

-- Sesiones: solo el propio usuario
create policy "Usuario ve sus sesiones"
  on sesiones_enfoque for all using (usuario_id = auth.uid());

-- Pausas: a través de la sesión del usuario
create policy "Usuario ve sus pausas"
  on pausas_sesion for all using (
    exists (
      select 1 from sesiones_enfoque s
      where s.id = pausas_sesion.sesion_id
        and s.usuario_id = auth.uid()
    )
  );

-- Videos: predefinidos (todos los auth) + los propios
create policy "Usuarios ven videos activos"
  on videos_pausa for select using (
    activo = true
    and (es_predefinido = true or creado_por = auth.uid())
  );

create policy "Usuarios gestionan sus videos"
  on videos_pausa for insert with check (creado_por = auth.uid());

create policy "Usuarios actualizan sus videos"
  on videos_pausa for update using (creado_por = auth.uid());

create policy "Usuarios eliminan sus videos"
  on videos_pausa for delete using (creado_por = auth.uid());

-- Categorías: predefinidas (todos) + las propias
create policy "Usuarios ven categorías"
  on categorias_finanzas for select using (
    es_predefinida = true or usuario_id = auth.uid()
  );

create policy "Usuarios gestionan sus categorías"
  on categorias_finanzas for insert with check (usuario_id = auth.uid());

create policy "Usuarios actualizan sus categorías"
  on categorias_finanzas for update using (usuario_id = auth.uid());

-- Transacciones: solo el propio usuario
create policy "Usuario ve sus transacciones"
  on transacciones for all using (usuario_id = auth.uid());

-- Finanzas proyecto: miembros del proyecto
create policy "Miembros ven finanzas del proyecto"
  on finanzas_proyecto for all using (
    is_project_member(proyecto_id)
  );

-- ────────────────────────────────────────────────────────────
-- 🌱 DATOS INICIALES
-- ────────────────────────────────────────────────────────────

-- Videos de pausa predefinidos
insert into videos_pausa (titulo, url_youtube, categoria, es_predefinido) values
  ('Estiramiento de cuello y hombros — 5 min',    'https://www.youtube.com/watch?v=p7W8RGvC3Dk', 'stretching',  true),
  ('Estiramiento de espalda para escritorio',     'https://www.youtube.com/watch?v=tAUf7aajBWE', 'stretching',  true),
  ('Técnica de respiración 4-7-8',                'https://www.youtube.com/watch?v=YRPh_GaiL8s', 'respiracion', true),
  ('Respiración de caja — Box Breathing',         'https://www.youtube.com/watch?v=_QTJY3nMGCE', 'respiracion', true),
  ('Meditación de 5 minutos para enfocarse',      'https://www.youtube.com/watch?v=inpok4MKVLM', 'meditacion',  true),
  ('Mindfulness rápido — 3 minutos',              'https://www.youtube.com/watch?v=6p_yaNFSYao', 'meditacion',  true),
  ('Caminata activa en casa — 5 min',             'https://www.youtube.com/watch?v=pEF4HpJbJHU', 'caminata',    true),
  ('Movimiento de bajo impacto en pausa',         'https://www.youtube.com/watch?v=Cg13zPQyEMo', 'caminata',    true);

-- Categorías de finanzas predefinidas
insert into categorias_finanzas (usuario_id, nombre, tipo, color, icono, es_predefinida) values
  -- Ingresos
  (null, 'Salario',           'ingreso', '#1D9E75', '💼', true),
  (null, 'Freelance',         'ingreso', '#378ADD', '💻', true),
  (null, 'Inversiones',       'ingreso', '#639922', '📈', true),
  (null, 'Otros ingresos',    'ingreso', '#AFA9EC', '➕', true),
  -- Gastos
  (null, 'Renta / Hipoteca',  'gasto',   '#D85A30', '🏠', true),
  (null, 'Alimentación',      'gasto',   '#EF9F27', '🍽️', true),
  (null, 'Transporte',        'gasto',   '#534AB7', '🚗', true),
  (null, 'Servicios',         'gasto',   '#B4B2A9', '💡', true),
  (null, 'Entretenimiento',   'gasto',   '#D4537E', '🎬', true),
  (null, 'Salud',             'gasto',   '#1D9E75', '❤️', true),
  (null, 'Educación',         'gasto',   '#378ADD', '📚', true),
  (null, 'Suscripciones',     'gasto',   '#7F77DD', '🔄', true),
  (null, 'Otros gastos',      'gasto',   '#6b7280', '📦', true);
