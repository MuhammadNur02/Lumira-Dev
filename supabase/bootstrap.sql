-- Run once per Supabase project as the owner (Task.md P2.01), before the first migration:
--   psql "$DATABASE_URL_DIRECT" -v app_password="<generated>" -f supabase/bootstrap.sql
-- Then in Settings → API remove `app` from the exposed schemas (the Data API never serves Lumira tables).
create schema if not exists app;

-- psql does not interpolate variables inside $$ blocks, so build the statement and \gexec it.
select format('create role lumira_app login password %L noinherit', :'app_password')
where not exists (select 1 from pg_roles where rolname = 'lumira_app')
\gexec

grant usage on schema app to lumira_app;
alter default privileges in schema app grant select, insert, update, delete on tables to lumira_app;
alter default privileges in schema app grant usage, select on sequences to lumira_app;

-- The pooler connection string for the app uses Supavisor's `role.project-ref` username:
--   postgresql://lumira_app.<project-ref>:<password>@<pooler-host>:6543/postgres
