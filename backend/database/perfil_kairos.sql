-- ============================================================
-- KAIROS — Perfil conversacional (capturado por ABAD)
-- Una fila por usuario, datos en JSONB flexible.
-- Ejecutar en Supabase Dashboard > SQL Editor.
-- Idempotente: se puede correr varias veces sin error.
-- ============================================================

create table if not exists perfil_kairos (
  id             uuid primary key default uuid_generate_v4(),
  usuario_id     uuid references auth.users(id) on delete cascade not null,
  datos          jsonb not null default '{}',
  creado_en      timestamptz default now(),
  actualizado_en timestamptz default now(),
  unique (usuario_id)
);

alter table perfil_kairos enable row level security;

drop policy if exists "Ver mi perfil kairos" on perfil_kairos;
create policy "Ver mi perfil kairos"
  on perfil_kairos for select using (usuario_id = auth.uid());

drop policy if exists "Crear mi perfil kairos" on perfil_kairos;
create policy "Crear mi perfil kairos"
  on perfil_kairos for insert with check (usuario_id = auth.uid());

drop policy if exists "Editar mi perfil kairos" on perfil_kairos;
create policy "Editar mi perfil kairos"
  on perfil_kairos for update using (usuario_id = auth.uid());

-- Trigger para actualizar actualizado_en automáticamente
create or replace function update_perfil_kairos_timestamp()
returns trigger language plpgsql as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

drop trigger if exists perfil_kairos_updated on perfil_kairos;
create trigger perfil_kairos_updated
  before update on perfil_kairos
  for each row execute function update_perfil_kairos_timestamp();
