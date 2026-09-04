-- La ubicacion puesta a mano por un admin se perdia: maybeUpdateUserGeo
-- (notifications router) reescribe users.geo_* con geolocalizacion por IP cada
-- vez que el navegador consulta notificaciones, sin distinguir si el dato lo
-- puso una persona.
--
-- geo_manual marca las ubicaciones fijadas a mano para que la IP no las pise.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS geo_manual boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.users.geo_manual IS
  'true = la ubicacion la fijo un administrador; la geolocalizacion por IP no debe sobrescribirla.';
