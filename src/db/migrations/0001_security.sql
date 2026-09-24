-- Custom migration (Task.md P2.04, NFR-SEC-12). Runs as the owner over the direct connection.
--
-- 1. The runtime role `lumira_app` gets DML on `app.*` only. On Supabase it is created with a
--    password by supabase/bootstrap.sql; elsewhere (local Postgres, tests) it is created here
--    without login so the policies below always have a target.
-- 2. RLS on every table with a policy for `lumira_app` only, so Supabase's anon/authenticated
--    roles are denied even if the schema is ever exposed through the Data API by mistake.
-- 3. `audit_log` is append-only for the runtime role.
--
-- Any later migration that adds a table must repeat the RLS + policy statements for it.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lumira_app') THEN
    CREATE ROLE lumira_app NOLOGIN;
  END IF;
END
$$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA app TO lumira_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO lumira_app;
--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO lumira_app;
--> statement-breakpoint
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'app' LOOP
    EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    EXECUTE format('DROP POLICY IF EXISTS lumira_app_all ON app.%I', t.tablename);
    EXECUTE format('CREATE POLICY lumira_app_all ON app.%I FOR ALL TO lumira_app USING (true) WITH CHECK (true)', t.tablename);
  END LOOP;
END
$$;
--> statement-breakpoint
REVOKE UPDATE, DELETE, TRUNCATE ON app.audit_log FROM lumira_app;
