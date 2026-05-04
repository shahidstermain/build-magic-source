-- Schedule weekly affiliate revenue summary email (Mondays 09:00 IST = 03:30 UTC)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'affiliate-weekly-summary') THEN
    PERFORM cron.unschedule('affiliate-weekly-summary');
  END IF;
END $$;

SELECT cron.schedule(
  'affiliate-weekly-summary',
  '30 3 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://tsduibmoqntxqdaswbef.supabase.co/functions/v1/affiliate-weekly-summary',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzZHVpYm1vcW50eHFkYXN3YmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNTIxMzYsImV4cCI6MjA5MjYyODEzNn0.R1B7cuzxY_sZczpm1reiPcpQTXBZPU5AXoXA65dcKb8"}'::jsonb,
    body := jsonb_build_object('triggered_at', now())
  );
  $$
);