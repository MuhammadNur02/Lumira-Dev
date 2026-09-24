import { defineConfig } from 'drizzle-kit'

// Migrations run in CI over the direct connection (port 5432) with the owner role (NFR-SEC-12).
// `drizzle-kit generate` needs no database; `migrate` and `studio` need DATABASE_URL_DIRECT.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  schemaFilter: ['app'],
  casing: 'snake_case',
  dbCredentials: { url: process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL ?? '' },
})
