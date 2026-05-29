-- ============================================================
-- KAIROS — Tabla pública de usuarios + trigger de registro
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ============================================================

-- Tabla pública con datos básicos de cada usuario
create table public.usuarios (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  nombre     text,
  creado_en  timestamptz default now()
);

-- RLS
alter table public.usuarios enable row level security;

create policy "Usuarios autenticados ven perfiles"
  on public.usuarios for select
  using (auth.uid() is not null);

create policy "Usuario actualiza su propio perfil"
  on public.usuarios for update
  using (id = auth.uid());

-- Trigger: auto-insertar al registrarse
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.usuarios (id, email, nombre)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Insertar usuarios ya existentes (los que creaste antes del trigger)
insert into public.usuarios (id, email, nombre)
select
  id,
  email,
  split_part(email, '@', 1)
from auth.users
on conflict (id) do nothing;
