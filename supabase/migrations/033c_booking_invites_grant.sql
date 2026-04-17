-- Step 3 of 3: harden + grant the invite RPC.

ALTER FUNCTION public.create_course_booking_with_invite(
  text, uuid, text, text, text, text, text, text, text, integer, text
) SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.create_course_booking_with_invite(
  text, uuid, text, text, text, text, text, text, text, integer, text
) TO service_role;
