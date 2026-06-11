-- ─────────────────────────────────────────────────────────────────────────────
-- Suscripciones / MercadoPago
-- Agrega columnas a la tabla pública `usuarios`.
-- Idempotente: se puede correr varias veces sin error.
-- ─────────────────────────────────────────────────────────────────────────────

alter table usuarios
  add column if not exists subscription_status text
    check (subscription_status in ('active','trialing','past_due','canceled','unpaid')),
  add column if not exists subscription_id     text;

-- ─────────────────────────────────────────────────────────────────────────────
-- IMPORTANTE: activa tu propia cuenta para no quedar bloqueado.
-- Reemplaza el UUID por el tuyo (lo ves en Supabase → Authentication → Users).
-- ─────────────────────────────────────────────────────────────────────────────
update usuarios
  set subscription_status = 'active'
  where id = 'cf5d14c8-a19a-4b07-8b71-804807a49c62';
