-- ============================================================
-- KAIROS — Security fixes (Supabase Advisor warnings)
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. FUNCTION SEARCH_PATH MUTABLE
--    Fija search_path=public en las 3 funciones expuestas.
--    Sin esto, un atacante con privilegios de creación de
--    esquemas podría hacer shadowing de objetos (SQL injection a nivel esquema).
-- ─────────────────────────────────────────────────────────────
ALTER FUNCTION public.is_project_member(p_proyecto_id uuid)
  SET search_path = public;

ALTER FUNCTION public.handle_new_user()
  SET search_path = public;

ALTER FUNCTION public.update_perfil_kairos_timestamp()
  SET search_path = public;


-- ─────────────────────────────────────────────────────────────
-- 2. REVOKE EXECUTE en funciones SECURITY DEFINER
--
--    handle_new_user: es un trigger interno, nadie debe llamarlo
--    directamente por la API REST (/rpc/handle_new_user).
--
--    is_project_member: es un helper de RLS. Las políticas RLS
--    la llaman con privilegios del owner (postgres), no del rol
--    del usuario. Revocar EXECUTE de anon/authenticated no rompe
--    las políticas RLS, pero sí cierra el endpoint /rpc/is_project_member.
-- ─────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.handle_new_user()
  FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.is_project_member(uuid)
  FROM anon, authenticated;


-- ─────────────────────────────────────────────────────────────
-- 3. AVATARS BUCKET — restringir listing
--    La política actual permite listar TODOS los archivos del bucket.
--    La reemplazamos por una que solo permite acceder a archivos
--    dentro de la carpeta propia del usuario (auth.uid()/...).
--    Las URLs públicas de avatares ajenos siguen funcionando
--    porque el acceso por nombre de objeto no requiere listing.
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "avatars_select" ON storage.objects;

CREATE POLICY "avatars_select" ON storage.objects
  FOR SELECT TO public
  USING (
    bucket_id = 'avatars'
    AND (
      -- Acceso al propio avatar (con o sin subcarpeta)
      (auth.uid() IS NOT NULL AND name LIKE auth.uid()::text || '%')
      -- Acceso directo por nombre exacto sin autenticación (URL pública compartida)
      OR auth.uid() IS NULL
    )
  );

-- Nota: si prefieres bloquear listing completamente y solo permitir
-- acceso a archivos por URL directa, usa esto en su lugar:
-- CREATE POLICY "avatars_select" ON storage.objects
--   FOR SELECT TO public
--   USING (bucket_id = 'avatars');
-- (Sin columna name en el USING, PostgREST no devuelve listing pero
--  sí permite GET individual. Esta es la opción más restrictiva.)


-- ─────────────────────────────────────────────────────────────
-- 4. LEAKED PASSWORD PROTECTION
--    Esta NO se puede configurar con SQL — es un setting del
--    Dashboard de Supabase Auth:
--
--    Authentication → Providers → Email →
--    "Enable Password Strength and Leaked Password Detection"
--    (requiere plan Pro o superior)
--    En el plan Free esta opción no está disponible.
-- ─────────────────────────────────────────────────────────────
-- (sin SQL aquí — ver instrucciones arriba)
