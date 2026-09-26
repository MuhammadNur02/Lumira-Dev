const CLERK_USER_ID = 'user_3JmQHrK0QrhOwy7wTKxVQELkRct'
const EMAIL = 'muchammad.nur02@gmail.com'
const NAME = 'Muhammad Nurrahman Juliansyah'

// Step 1: Set Clerk public metadata → role: admin
console.log('Step 1: Setting Clerk publicMetadata.role = admin ...')
const clerkResp = await fetch(`https://api.clerk.com/v1/users/${CLERK_USER_ID}/metadata`, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ public_metadata: { role: 'admin' } }),
})
if (!clerkResp.ok) {
  console.error('Clerk error:', clerkResp.status, await clerkResp.text())
  process.exit(1)
}
console.log('  ✅ Clerk metadata updated!')

// Step 2: Upsert user in Postgres as admin
console.log('Step 2: Upserting user in Postgres as admin ...')
const { default: postgres } = await import(
  new URL('./node_modules/postgres/src/index.js', 'file:///' + process.cwd().replace(/\\/g, '/') + '/').href
)
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, idle_timeout: 5 })
try {
  await sql`
    INSERT INTO app.users (id, email, name, role)
    VALUES (${CLERK_USER_ID}, ${EMAIL}, ${NAME}, 'admin')
    ON CONFLICT (id) DO UPDATE SET role = 'admin', email = ${EMAIL}, name = ${NAME}
  `
  console.log('  ✅ Postgres user upserted as admin!')

  // Verify
  const [row] = await sql`SELECT id, email, role FROM app.users WHERE id = ${CLERK_USER_ID}`
  console.log(`  Verified: ${row.email} → role=${row.role}`)
} finally {
  await sql.end()
}

console.log('\n🎉 Done! Now:')
console.log('  1. Sign out and sign back in at http://localhost:3000/sign-in')
console.log('     (Clerk needs a fresh session to pick up the new metadata)')
console.log('  2. Go to http://localhost:3000/admin')
console.log('  Note: The admin guard also checks 2FA. If you get redirected to')
console.log('  /account/settings/security, you may want to temporarily disable that check.')
