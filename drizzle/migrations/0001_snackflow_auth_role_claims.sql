CREATE FUNCTION public.apply_staff_role_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  invited_role public.app_role;
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.staff_role_invites
  SET claimed_at = now(), claimed_by = NEW.id
  WHERE lower(email) = lower(NEW.email)
    AND claimed_at IS NULL
  RETURNING role INTO invited_role;

  IF invited_role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, invited_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.apply_staff_role_invite() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER assign_invited_staff_role_after_signup
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.apply_staff_role_invite();