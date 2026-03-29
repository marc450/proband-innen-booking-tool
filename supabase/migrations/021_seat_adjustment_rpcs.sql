-- RPC to decrement booked_seats (when cancelling/refunding a booking)
CREATE OR REPLACE FUNCTION decrement_booked_seats(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE course_sessions
  SET booked_seats = GREATEST(booked_seats - 1, 0)
  WHERE id = p_session_id;
END;
$$;

-- RPC to increment booked_seats (when reverting a cancellation)
CREATE OR REPLACE FUNCTION increment_booked_seats(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE course_sessions
  SET booked_seats = LEAST(booked_seats + 1, max_seats)
  WHERE id = p_session_id;
END;
$$;
