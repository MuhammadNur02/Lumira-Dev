import { defineCliConfig } from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? 'replace-me',
    dataset: process.env.SANITY_STUDIO_DATASET ?? 'production',
  },
  studioHost: 'lumira', // → https://lumira.sanity.studio
  deployment: { autoUpdates: true },
  typegen: {
    path: '../src/**/*.{ts,tsx}',
    schema: './schema.json',
    generates: '../src/sanity/types.ts',
    overloadClientMethods: true,
  },
})
