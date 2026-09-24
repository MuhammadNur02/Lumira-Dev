# Secret rotation

| Secret | Procedure |
|---|---|
| `LS_WEBHOOK_SECRET` | LS webhook settings → set the new secret → update Vercel → redeploy. Failed deliveries during the switch are retried by LS; replay leftovers from Admin → Webhooks. |
| `CLERK_WEBHOOK_SIGNING_SECRET`, `RESEND_WEBHOOK_SECRET`, `SANITY_WEBHOOK_SECRET` | Roll in the provider, update Vercel, redeploy, replay failures. |
| `LS_API_KEY`, R2 tokens, `DISCORD_BOT_TOKEN`, `RESEND_API_KEY`, Sanity tokens | Create the new credential → update Vercel → redeploy → Admin → Integrations green → revoke the old one. |
| `DOWNLOAD_TOKEN_SECRET` | Rotating invalidates every emailed download link (72 h lifetime). Rotate, redeploy; buyers can still download from the Library. |
| `GUEST_SCOPE_SECRET` | Invalidates success-page guest scopes (30 min). Safe to rotate anytime. |
| `DISCORD_STATE_SECRET` | Invalidates in-flight OAuth attempts (10 min). Safe anytime. |
| `CRON_SECRET` | Update in Vercel; crons pick it up on the next deployment. |
| `IP_HASH_SALT` | Changes every future IP hash; historical hashes stop matching (anomaly windows restart). |
| `LICENSE_HASH_PEPPER` | Do not rotate casually: every `license_keys.key_hash` must be recomputed from the decrypted keys in one migration job, or lookups by key fail. |
| `LICENSE_ENCRYPTION_KEY` | Never replace in place. Add a `v2` key to the key ring in `src/lib/licensing/crypto.ts` (new env var), deploy, re-encrypt rows in a background job (`v1:` → `v2:`), confirm no `v1:` rows remain, then retire `v1`. |
