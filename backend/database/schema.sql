-- ============================================================
-- KAIROS — Schema PostgreSQL para Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- ── Extensiones ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── PROYECTOS ────────────────────────────────────────────────
create table proyectos (
  id          uuid primary key default uuid_generate_v4(),
  nombre      text not null,
  descripcion text,
  creado_por  uuid references auth.users(id) on delete set null,
  creado_en   timestamptz default now()
);

-- ── MIEMBROS DE PROYECTO ─────────────────────────────────────
create table miembros (
  proyecto_id uuid references proyectos(id) on delete cascade,
  usuario_id  uuid references auth.users(id) on delete cascade,
  rol         text not null default 'miembro', -- 'admin' | 'miembro'
  primary key (proyecto_id, usuario_id)
);

-- ── TABLEROS ─────────────────────────────────────────────────
create table tableros (
  id          uuid primary key default uuid_generate_v4(),
  proyecto_id uuid references proyectos(id) on delete cascade not null,
  nombre      text not null,
  orden       int  not null default 0
);

-- ── COLUMNAS ─────────────────────────────────────────────────
create table columnas (
  id          uuid primary key default uuid_generate_v4(),
  tablero_id  uuid references tableros(id) on delete cascade not null,
  nombre      text not null,
  orden       int  not null default 0,
  color       text not null default '#B4B2A9'
);

-- ── ETIQUETAS ────────────────────────────────────────────────
create table etiquetas (
  id          uuid primary key default uuid_generate_v4(),
  proyecto_id uuid references proyectos(id) on delete cascade not null,
  nombre      text not null,
  color       text not null
);

-- ── TARJETAS ─────────────────────────────────────────────────
create table tarjetas (
  id           uuid primary key default uuid_generate_v4(),
  columna_id   uuid references columnas(id) on delete cascade not null,
  asignado_a   uuid references auth.users(id) on delete set null,
  titulo       text not null,
  descripcion  text,
  prioridad    text default 'normal', -- 'baja' | 'normal' | 'alta'
  fecha_limite date,
  cover_url    text,
  orden        int  not null default 0,
  creado_en    timestamptz default now()
);

-- ── TARJETA ↔ ETIQUETA ───────────────────────────────────────
create table tarjeta_etiqueta (
  tarjeta_id  uuid references tarjetas(id) on delete cascade,
  etiqueta_id uuid references etiquetas(id) on delete cascade,
  primary key (tarjeta_id, etiqueta_id)
);

-- ── COMENTARIOS ──────────────────────────────────────────────
create table comentarios (
  id         uuid primary key default uuid_generate_v4(),
  tarjeta_id uuid references tarjetas(id) on delete cascade not null,
  autor_id   uuid references auth.users(id) on delete set null,
  contenido  text not null,
  creado_en  timestamptz default now()
);

-- ── REGISTROS DE TIEMPO ──────────────────────────────────────
create table registros_tiempo (
  id               uuid primary key default uuid_generate_v4(),
  tarjeta_id       uuid references tarjetas(id) on delete cascade not null,
  usuario_id       uuid references auth.users(id) on delete set null,
  inicio           timestamptz not null,
  fin              timestamptz,
  segundos_totales int generated always as (
    extract(epoch from (fin - inicio))::int
  ) stored
);

-- ── EVENTOS DE CALENDARIO ────────────────────────────────────
create table eventos_calendario (
  id           uuid primary key default uuid_generate_v4(),
  proyecto_id  uuid references proyectos(id) on delete cascade,
  tarjeta_id   uuid references tarjetas(id) on delete set null,
  titulo       text not null,
  fecha_inicio timestamptz not null,
  fecha_fin    timestamptz,
  tipo         text default 'evento' -- 'evento' | 'entrega' | 'reunion'
);

-- ── PLAYLISTS ────────────────────────────────────────────────
create table playlists (
  id          uuid primary key default uuid_generate_v4(),
  nombre      text not null,
  plataforma  text not null, -- 'spotify' | 'youtube'
  url_externa text not null,
  creado_por  uuid references auth.users(id) on delete set null,
  activa      boolean default false
);

-- ── FRASES DEL DÍA ───────────────────────────────────────────
create table frases_dia (
  id                uuid primary key default uuid_generate_v4(),
  contenido         text not null,
  autor             text,
  creado_por        uuid references auth.users(id) on delete set null,
  fecha_programada  date,
  activa            boolean default true
);

-- ============================================================
-- RLS (Row Level Security) — habilitar en todas las tablas
-- ============================================================
alter table proyectos           enable row level security;
alter table miembros            enable row level security;
alter table tableros            enable row level security;
alter table columnas            enable row level security;
alter table etiquetas           enable row level security;
alter table tarjetas            enable row level security;
alter table tarjeta_etiqueta    enable row level security;
alter table comentarios         enable row level security;
alter table registros_tiempo    enable row level security;
alter table eventos_calendario  enable row level security;
alter table playlists           enable row level security;
alter table frases_dia          enable row level security;

-- ── Política base: acceso solo a miembros del proyecto ───────
-- (Las políticas detalladas se agregan al construir cada módulo)
create policy "Miembros ven sus proyectos"
  on proyectos for select
  using (
    auth.uid() = creado_por
    or exists (
      select 1 from miembros
      where miembros.proyecto_id = proyectos.id
        and miembros.usuario_id = auth.uid()
    )
  );
